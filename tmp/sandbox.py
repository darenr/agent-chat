from mcp_run_python import code_sandbox

code = """
import numpy
numpy.array([1, 2, 3])

"""


async def main():
    async with code_sandbox(dependencies=["numpy"]) as sandbox:
        result = await sandbox.eval(code)
        print(result)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
