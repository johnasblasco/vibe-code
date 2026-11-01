"""Regression checks for portable acceptance-scenario module identifiers."""
import unittest

from run_scenarios import QB, files_for, ly
import os


class ModulePathTests(unittest.TestCase):
    def test_loaded_files_use_portable_identifiers(self):
        router = ly(os.path.join(QB, "00-router.yaml"))
        loaded = files_for(router, "T1")
        self.assertIn("software/01-product-users-data", loaded)
        self.assertTrue(all("\\" not in name for name in loaded), loaded)


if __name__ == "__main__":
    unittest.main()
