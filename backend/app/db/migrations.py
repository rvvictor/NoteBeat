from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


PROFILE_COLUMNS = {
    "display_name": "VARCHAR(80)",
    "bio": "VARCHAR(220)",
    "avatar_url": "TEXT",
    "cover_url": "TEXT",
}


def ensure_user_profile_columns(engine: Engine) -> None:
    inspector = inspect(engine)
    existing_columns = {
        column["name"] for column in inspector.get_columns("users")
    }

    missing_columns = [
        (name, column_type)
        for name, column_type in PROFILE_COLUMNS.items()
        if name not in existing_columns
    ]

    if not missing_columns:
        return

    with engine.begin() as connection:
        for name, column_type in missing_columns:
            connection.execute(
                text(f"ALTER TABLE users ADD COLUMN {name} {column_type}")
            )

        if "display_name" in dict(missing_columns):
            connection.execute(
                text(
                    "UPDATE users "
                    "SET display_name = username "
                    "WHERE display_name IS NULL"
                )
            )
