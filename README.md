# Backend API for Seka Lumbung Mesari

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
# install node
$ node -v
# Version used: >22.x

# If you don't have node, install it from https://nodejs.org/en/download/
# If you don't have npm, install it from https://www.npmjs.com/get-npm

# Install node version 22.x
$ nvm install 22.x
$ nvm use 22.x


# install dependencies
$ npm install
```

## Run the project

### Docker

```bash
# Run project dependencies with docker (postgresql)
$ docker-compose -f docker-compose-dev.yml up -d

# Connect with the database
psql -h localhost -p 5432 -U admin -d db_lumbung_mesari
```

### Local

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
