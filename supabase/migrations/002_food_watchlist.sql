-- Extend library_items to support 'food' type for the Foods to Watch watchlist
ALTER TABLE library_items DROP CONSTRAINT library_items_type_check;
ALTER TABLE library_items ADD CONSTRAINT library_items_type_check
  CHECK (type IN ('medication', 'cream', 'supplement', 'food'));
