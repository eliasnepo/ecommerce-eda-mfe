CREATE SCHEMA IF NOT EXISTS product;

CREATE TABLE product.products (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255)   NOT NULL,
    description TEXT,
    price       NUMERIC(10, 2) NOT NULL,
    category    VARCHAR(100),
    image_url   VARCHAR(500),
    created_at  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON product.products (category);
