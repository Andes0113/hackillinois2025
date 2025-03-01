FROM python:3.9

WORKDIR /app

COPY pyproject.toml ./

RUN pip install --upgrade pip && pip install poetry

RUN apt-get update && apt-get install -y \
    llvm-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN poetry run pip install "Allvmlite==0.36.0"
RUN poetry install

COPY . .

CMD ["poetry", "run", "uvicorn", "main:app", "--reload"]
