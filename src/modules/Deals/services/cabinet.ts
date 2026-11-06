import {
   createRow,
   deleteRow,
   listRows,
   str,
   updateRow,
} from '@shared/api/ucode';
import { newId, newPassword, passwordHash } from '@shared/helpers';
import type {
   CabinetPerson,
   CabinetTeamRow,
   CabinetUserInput,
   Deal,
} from '@shared/types/deals.types';
import type { StaffCredentials } from '@shared/types/settings.types';
import dayjs from 'dayjs';
import { hasStartupFields, publicStatusOf } from './ucode';

// Telegram and WhatsApp, written once ucode has batch 23's fields.
const handles = (row: { telegram?: string; whatsapp?: string }) =>
   hasStartupFields()
      ? { telegram: row.telegram ?? '', whatsapp: row.whatsapp ?? '' }
      : {};

/* Who signs in to the startup cabinet, as the fund manages them on a deal's or a
   company's card (cabinet_members, batch 21). The password is made here and shown
   once, and only its hash is kept; the cabinet's server checks it. A person's row
   belongs to the application, so a deal entered by hand gets one with its first
   user, and the whole cabinet then works from it. The one who applied has a row
   only once they get a password or their access is closed. */

const REF_LETTERS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

// SQBV-2026-7K3QX9, as the website numbers an application.
const newRef = () =>
   `SQBV-${new Date().getFullYear()}-${Array.from(
      crypto.getRandomValues(new Uint8Array(6)),
      (value) => REF_LETTERS[value % REF_LETTERS.length],
   ).join('')}`;

const normal = (email: string) => email.trim().toLowerCase();

// The application behind a deal the website did not open, for its cabinet.
const openApplication = async (deal: Deal, name: string, email: string) => {
   const guid = newId();
   const now = new Date().toISOString();
   await createRow('applications', {
      guid,
      ref: newRef(),
      status: 'new',
      contact_name: name,
      email,
      phone: deal.applicantPhone ?? '',
      startup_name: deal.company,
      source: 'panel',
      locale: 'ru',
      submitted_at: dayjs(deal.receivedAt).toISOString(),
      public_status: publicStatusOf(deal) ?? 'submitted',
      public_status_at: now,
   });
   // the deal's own contact stays, if it has one
   await updateRow('deals', {
      guid: deal.id,
      applications_id: guid,
      ...(!deal.applicantName && { applicant_name: name }),
      ...(!deal.applicantEmail && { applicant_email: email }),
   });
   return guid;
};

const newLogin = async (email: string) => {
   const password = newPassword();
   const credentials: StaffCredentials = { login: email, password };
   return { credentials, password_hash: await passwordHash(password) };
};

// A new password ends the sessions the old one may have opened.
const endSignIns = async (email: string) => {
   const rows = await listRows('founder_codes', { email }).catch(
      (error: unknown) => {
         console.warn('founder_codes could not be read', error);
         return [];
      },
   );
   await Promise.all(
      rows
         .filter(
            (row) =>
               normal(str(row.email)) === email &&
               row.used_at &&
               !row.revoked_at,
         )
         .map((row) =>
            updateRow('founder_codes', {
               guid: row.guid,
               revoked_at: new Date().toISOString(),
            }),
         ),
   );
};

const newRow = (
   applicationId: string,
   person: Pick<CabinetPerson, 'name' | 'email' | 'role'>,
   addedBy: string,
   {
      telegram,
      whatsapp,
      ...fields
   }: {
      is_active: boolean;
      password_hash?: string;
      telegram?: string;
      whatsapp?: string;
   },
) =>
   createRow('cabinet_members', {
      guid: newId(),
      email: person.email,
      full_name: person.name,
      role: person.role,
      added_at: new Date().toISOString(),
      added_by: addedBy,
      applications_id: applicationId,
      ...fields,
      ...handles({ telegram, whatsapp }),
   });

export const addCabinetUser = async (
   deal: Deal,
   input: CabinetUserInput,
   addedBy: string,
) => {
   const email = normal(input.email);
   const name = input.name.trim();
   // the first user of a deal entered by hand owns its cabinet
   const applicationId =
      deal.applicationId ?? (await openApplication(deal, name, email));
   const role = deal.applicationId ? input.role : 'ceo';
   const { credentials, password_hash } = await newLogin(email);
   await newRow(applicationId, { name, email, role }, addedBy, {
      is_active: true,
      password_hash,
   });
   return credentials;
};

export const issueCabinetPassword = async (
   deal: Deal,
   person: CabinetPerson,
   addedBy: string,
) => {
   const { credentials, password_hash } = await newLogin(person.email);
   if (person.id)
      await updateRow('cabinet_members', { guid: person.id, password_hash });
   else
      await newRow(deal.applicationId ?? '', person, addedBy, {
         is_active: person.active,
         password_hash,
      });
   await endSignIns(person.email);
   return credentials;
};

export const setCabinetAccess = async (
   deal: Deal,
   person: CabinetPerson,
   active: boolean,
   addedBy: string,
) => {
   if (person.id)
      await updateRow('cabinet_members', {
         guid: person.id,
         is_active: active,
      });
   else
      await newRow(deal.applicationId ?? '', person, addedBy, {
         is_active: active,
      });
};

export const updateCabinetUser = async (
   deal: Deal,
   person: CabinetPerson,
   input: CabinetUserInput,
) => {
   const email = normal(input.email);
   const name = input.name.trim();
   // the one who applied is the application's contact
   if (person.owner)
      await Promise.all([
         updateRow('applications', {
            guid: deal.applicationId ?? '',
            contact_name: name,
            email,
         }),
         updateRow('deals', {
            guid: deal.id,
            applicant_name: name,
            applicant_email: email,
         }),
      ]);
   if (person.id)
      await updateRow('cabinet_members', {
         guid: person.id,
         email,
         full_name: name,
         ...(!person.owner && { role: input.role }),
      });
};

export const removeCabinetUser = (person: CabinetPerson) =>
   deleteRow('cabinet_members', person.id);

/* The team as the deal's «Данные стартапа» left it: people taken off are
   deleted, the others changed where they differ, new ones added without a
   password (the card gives it). Without a cabinet yet, the first person opens
   it and owns it. The owner is the application's contact; they get a row of
   their own only for what the application does not hold: Telegram, WhatsApp
   or closed access. Answers whether anything changed. */
export const saveCabinetTeam = async (
   deal: Deal,
   before: CabinetPerson[],
   team: CabinetTeamRow[],
   addedBy: string,
) => {
   const rows = team.map((row) => ({
      ...row,
      name: row.name.trim(),
      email: normal(row.email),
   }));
   let applicationId = deal.applicationId ?? '';
   if (!applicationId) {
      const [first] = rows;
      if (!first) return false;
      applicationId = await openApplication(deal, first.name, first.email);
      rows[0] = { ...first, owner: true, role: 'ceo' };
   }
   const writes: Promise<unknown>[] = [];
   for (const person of before)
      if (!person.owner && person.id && !rows.some(({ id }) => id === person.id))
         writes.push(deleteRow('cabinet_members', person.id));
   for (const row of rows) {
      const previous = before.find((person) =>
         row.owner ? person.owner : !!row.id && person.id === row.id,
      );
      const fields = {
         email: row.email,
         full_name: row.name,
         role: row.owner ? 'ceo' : row.role,
         ...handles(row),
         is_active: row.active,
      };
      const changed =
         !previous ||
         previous.name !== row.name ||
         previous.email !== row.email ||
         (!row.owner && previous.role !== row.role) ||
         previous.telegram !== row.telegram ||
         previous.whatsapp !== row.whatsapp ||
         previous.active !== row.active;
      if (!changed) continue;
      // the owner signs in with the application's email; the deal's own
      // contact («Email компании») is kept apart
      if (
         row.owner &&
         previous &&
         (previous.name !== row.name || previous.email !== row.email)
      )
         writes.push(
            updateRow('applications', {
               guid: applicationId,
               contact_name: row.name,
               email: row.email,
            }),
         );
      if (previous?.id)
         writes.push(updateRow('cabinet_members', { guid: previous.id, ...fields }));
      else if (
         !row.owner ||
         !row.active ||
         ((row.telegram || row.whatsapp) && hasStartupFields())
      )
         writes.push(
            newRow(applicationId, { ...row, role: fields.role as CabinetPerson['role'] }, addedBy, {
               is_active: row.active,
               telegram: row.telegram,
               whatsapp: row.whatsapp,
            }),
         );
   }
   await Promise.all(writes);
   return writes.length > 0 || !deal.applicationId;
};
