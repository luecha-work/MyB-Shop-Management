CONTAINER_NAME ?= shop_postgres
DB_NAME ?= shop_db
DB_USER ?= shop_user
DB_PASSWORD ?= shop_password
DB_PORT ?= 5432
POSTGRES_IMAGE ?= postgres:16-alpine

.PHONY: help up start stop restart down remove logs ps psql reset

help:
	@echo "Available commands:"
	@echo "  make up       Create and start PostgreSQL container"
	@echo "  make start    Start existing PostgreSQL container"
	@echo "  make stop     Stop PostgreSQL container"
	@echo "  make restart  Restart PostgreSQL container"
	@echo "  make down     Stop PostgreSQL container"
	@echo "  make remove   Remove PostgreSQL container"
	@echo "  make logs     Show PostgreSQL logs"
	@echo "  make ps       Show container status"
	@echo "  make psql     Open psql shell"
	@echo "  make reset    Remove and recreate PostgreSQL container"

up:
	docker run -d \
		--name $(CONTAINER_NAME) \
		-e POSTGRES_DB=$(DB_NAME) \
		-e POSTGRES_USER=$(DB_USER) \
		-e POSTGRES_PASSWORD=$(DB_PASSWORD) \
		-e TZ=Asia/Bangkok \
		-e PGTZ=Asia/Bangkok \
		-p $(DB_PORT):5432 \
		$(POSTGRES_IMAGE)

start:
	docker start $(CONTAINER_NAME)

stop:
	docker stop $(CONTAINER_NAME)

restart:
	docker restart $(CONTAINER_NAME)

down:
	docker stop $(CONTAINER_NAME)

remove:
	docker rm -f $(CONTAINER_NAME)

logs:
	docker logs -f $(CONTAINER_NAME)

ps:
	docker ps -a --filter name=$(CONTAINER_NAME)

psql:
	docker exec -it $(CONTAINER_NAME) psql -U $(DB_USER) -d $(DB_NAME)

reset:
	docker rm -f $(CONTAINER_NAME)
	docker run -d \
		--name $(CONTAINER_NAME) \
		-e POSTGRES_DB=$(DB_NAME) \
		-e POSTGRES_USER=$(DB_USER) \
		-e POSTGRES_PASSWORD=$(DB_PASSWORD) \
		-e TZ=Asia/Bangkok \
		-e PGTZ=Asia/Bangkok \
		-p $(DB_PORT):5432 \
		$(POSTGRES_IMAGE)
