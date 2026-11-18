# runs every source once (used by the nightly action). --dry-run doesn't save anything

import argparse
import asyncio
import traceback

from dataPipeline.pipeline import (
    run_reletme_pipeline,
    run_rotatingroom_pipeline,
    run_subleaps_pipeline,
)

SOURCES = {
    "ReletMe": run_reletme_pipeline,
    "SubLeaps": run_subleaps_pipeline,
    "RotatingRoom": run_rotatingroom_pipeline,
}


async def run_all(sources, dry_run=False):
    failed = []
    for name, run in sources.items():
        print(f"--- {name} ---")
        try:
            result = await run(dry_run=dry_run)
            print(f"{name}: {result.valid} listings ({result.inserted} new, {result.updated} updated, "
                  f"{result.invalid} rejected, {result.removed} no longer listed)")
        except Exception:
            traceback.print_exc()
            print(f"{name}: FAILED")
            failed.append(name)
    return failed


def main(argv=None):
    parser = argparse.ArgumentParser(description="Run all AlgoRent listing sources")
    parser.add_argument("--dry-run", action="store_true", help="don't write to the database")
    args = parser.parse_args(argv)

    failed = asyncio.run(run_all(SOURCES, dry_run=args.dry_run))
    if failed:
        print(f"Failed sources: {', '.join(failed)}")
        return 1
    print("All sources finished.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
