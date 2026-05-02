CREATE SCHEMA IF NOT EXISTS ai_history;

CREATE TABLE ai_history.user_orders (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID        NOT NULL UNIQUE,
    user_id      BIGINT      NOT NULL,
    total        NUMERIC(19, 2) NOT NULL,
    ordered_at   TIMESTAMPTZ NOT NULL,
    consumed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_orders_user_id ON ai_history.user_orders (user_id);

CREATE TABLE ai_history.user_order_items (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_order_id UUID        NOT NULL REFERENCES ai_history.user_orders (id) ON DELETE CASCADE,
    product_id    UUID        NOT NULL,
    product_name  TEXT        NOT NULL,
    unit_price    NUMERIC(19, 2) NOT NULL,
    quantity      INT         NOT NULL
);

CREATE INDEX idx_user_order_items_order_id ON ai_history.user_order_items (user_order_id);
