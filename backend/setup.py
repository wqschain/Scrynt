from setuptools import setup, find_packages

setup(
    name="scrynt-backend",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.95.2",
        "uvicorn==0.21.1",
        "pandas==2.2.0",
        "python-dotenv==1.0.1",
        "requests==2.31.0",
        "sqlalchemy==2.0.27",
        "pydantic==1.10.13",
        "python-jose[cryptography]==3.3.0",
        "passlib[bcrypt]==1.7.4",
        "python-multipart==0.0.9",
        "aiofiles==23.2.1",
        "numpy==1.26.4"
    ],
) 