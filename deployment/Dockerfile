ARG PG_MAJOR=17
ARG EXT_VERSION=1.6.0

FROM postgres:${PG_MAJOR}-bookworm

RUN set -eux; \
  apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*; \
  tmp="$(mktemp -d)"; cd "$tmp"; \
  curl -fsSL -O "https://github.com/fboulnois/pg_uuidv7/releases/download/v${EXT_VERSION}/pg_uuidv7.tar.gz"; \
  curl -fsSL -O "https://github.com/fboulnois/pg_uuidv7/releases/download/v${EXT_VERSION}/SHA256SUMS"; \
  tar xf pg_uuidv7.tar.gz; \
  sha256sum -c SHA256SUMS; \
  PG_MAJ="$(pg_config --version | sed 's/^.* \([0-9]\{1,\}\).*$/\1/')"; \
  install -m0755 "${PG_MAJ}/pg_uuidv7.so" "$(pg_config --pkglibdir)/pg_uuidv7.so"; \
  install -m0644 "pg_uuidv7--${EXT_VERSION}.sql" "pg_uuidv7.control" "$(pg_config --sharedir)/extension/"; \
  cd / && rm -rf "$tmp"; \
  apt-get purge -y --auto-remove curl && rm -rf /var/lib/apt/lists/*