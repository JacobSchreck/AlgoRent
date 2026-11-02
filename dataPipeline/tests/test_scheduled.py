import asyncio
import unittest
from unittest import mock

from dataPipeline import scheduled
from dataPipeline.pipeline import PipelineResult

GOOD_RESULT = PipelineResult(fetched=2, valid=2, invalid=0, inserted=1, updated=1, images=0,
                             source_count_verified=True)


async def good_source(dry_run=False):
    return GOOD_RESULT


async def broken_source(dry_run=False):
    raise RuntimeError("site is down")


class ScheduledTest(unittest.TestCase):
    def test_keeps_going_when_one_source_fails(self):
        with mock.patch("builtins.print"), mock.patch("traceback.print_exc"):
            failed = asyncio.run(scheduled.run_all({"Broken": broken_source, "Good": good_source}))
        self.assertEqual(failed, ["Broken"])

    def test_exit_code_is_1_if_a_source_fails(self):
        with mock.patch.dict(scheduled.SOURCES, {"Broken": broken_source}, clear=True), \
                mock.patch("builtins.print"), mock.patch("traceback.print_exc"):
            self.assertEqual(scheduled.main([]), 1)

    def test_exit_code_is_0_when_everything_works(self):
        with mock.patch.dict(scheduled.SOURCES, {"Good": good_source}, clear=True), \
                mock.patch("builtins.print"):
            self.assertEqual(scheduled.main([]), 0)


if __name__ == "__main__":
    unittest.main()
