FROM postgres:14

RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    postgresql-server-dev-14

RUN git clone https://github.com/pgvector/pgvector.git \
    && cd pgvector \
    && make \
    && make install
