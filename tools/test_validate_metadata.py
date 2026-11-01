"""Bank metadata must not be treated as an orphan question module."""
import unittest
from validate import valid_bank_metadata


class BankMetadataTests(unittest.TestCase):
    def test_valid_metadata(self):
        self.assertTrue(valid_bank_metadata({"schema": "question-bank/v1", "bank_version": "1.0.0"}))

    def test_invalid_or_disguised_question_metadata(self):
        for value in [None, {}, {"schema": "question-bank/v1", "bank_version": "01.0.0"},
                      {"schema": "question-bank/v1", "bank_version": "1.0.0", "modules": []}]:
            self.assertFalse(valid_bank_metadata(value))


if __name__ == '__main__':
    unittest.main()
