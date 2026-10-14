
import asyncio
from sqlalchemy import text
from app.db.session import engine


async def main():
    async with engine.connect() as connection:
        result = await connection.execute(text("SELECT 1"))
        print("Database connection successful:", result.scalar())

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
