CREATE SCHEMA IF NOT EXISTS orders;

CREATE TABLE orders.orders (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     BIGINT         NOT NULL,
    status      VARCHAR(32)    NOT NULL,
    total       NUMERIC(10, 2) NOT NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON orders.orders (user_id);

CREATE TABLE orders.order_items (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID           NOT NULL REFERENCES orders.orders (id) ON DELETE CASCADE,
    product_id   UUID           NOT NULL,
    product_name VARCHAR(255)   NOT NULL,
    unit_price   NUMERIC(10, 2) NOT NULL,
    quantity     INT            NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order_id ON orders.order_items (order_id);
