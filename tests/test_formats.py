"""DUAL-06: the Python checks expect each format's size; projects without `format` stay 1080x1920."""
import unittest
from formats import dims,analysis_size,FORMATS
class Formats(unittest.TestCase):
    def test_sizes(self):
        self.assertEqual(dims({'version':1}),(1080,1920))
        self.assertEqual(dims({'version':2}),(1080,1920))
        self.assertEqual(dims({'version':2,'format':'landscape-v1'}),(1920,1080))
        self.assertEqual(dims({'version':2,'format':'square-v1'}),(1080,1080))
        self.assertEqual(analysis_size({'version':2}),(180,320))
        self.assertEqual(analysis_size({'version':2,'format':'landscape-v1'}),(320,180))
    def test_unknown_format_is_an_error(self):
        with self.assertRaises(KeyError):dims({'version':2,'format':'cinema-v1'})
        self.assertEqual(set(FORMATS),{'vertical-v1','landscape-v1','square-v1'})
if __name__=='__main__':unittest.main()
