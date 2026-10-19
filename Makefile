CURRENT_DIR=$(shell pwd)
# APP = repo/dir name, so the image path matches image.repository in Ucode-io/deployments
APP=$(shell basename ${CURRENT_DIR})

# Defaults; the CI (Ucode-io/ci-cd build.yml) overrides REGISTRY/PROJECT_NAME/TAG/ENV_TAG.
REGISTRY=ghcr.io
PROJECT_NAME=ucode-io
TAG=latest
ENV_TAG=latest
DOCKERFILE=Dockerfile

# Where staff sign in to ucode (.env.example): public ids, written into the bundle at build
# time, so changing them needs a new build. Client types are tried in order: STAFF, then ADMIN.
UCODE_PROJECT_ID=7b7f88ab-7ba6-41e5-8782-25e0c1c59d53
UCODE_ENVIRONMENT_ID=9f012d7a-0eb0-4a3a-87c7-16661eafce08
UCODE_CLIENT_TYPE_IDS=730fcd15-19e9-4822-8bb5-758965fedf95,3b35b594-3807-430b-920d-d66725d0275c

build-image:
	@test -n "${UCODE_PROJECT_ID}" -a -n "${UCODE_ENVIRONMENT_ID}" -a -n "${UCODE_CLIENT_TYPE_IDS}" || \
		{ echo "Fill in UCODE_* in the Makefile: without them the panel cannot sign anyone in"; exit 1; }
	docker build --rm -t ${REGISTRY}/${PROJECT_NAME}/${APP}:${TAG} . -f ${DOCKERFILE} \
		--build-arg VITE_UCODE_PROJECT_ID=${UCODE_PROJECT_ID} \
		--build-arg VITE_UCODE_ENVIRONMENT_ID=${UCODE_ENVIRONMENT_ID} \
		--build-arg VITE_UCODE_CLIENT_TYPE_IDS=${UCODE_CLIENT_TYPE_IDS}
	docker tag ${REGISTRY}/${PROJECT_NAME}/${APP}:${TAG} ${REGISTRY}/${PROJECT_NAME}/${APP}:${ENV_TAG}

push-image:
	docker push ${REGISTRY}/${PROJECT_NAME}/${APP}:${TAG}
	docker push ${REGISTRY}/${PROJECT_NAME}/${APP}:${ENV_TAG}

clear-image:
	docker rmi ${REGISTRY}/${PROJECT_NAME}/${APP}:${TAG}
	docker rmi ${REGISTRY}/${PROJECT_NAME}/${APP}:${ENV_TAG}

.PHONY: build-image push-image clear-image
