"""DUAL-06 output formats for the Python checks (mirror of src/core/formats.js; tests/formats.test.js keeps them equal)."""
FORMATS={'vertical-v1':(1080,1920),'landscape-v1':(1920,1080),'square-v1':(1080,1080)}
DEFAULT_FORMAT='vertical-v1'
def dims(scene):
    """(width, height) of a scene's output; version-1 scenes and projects without `format` are 1080x1920."""
    if scene.get('version')!=2:return FORMATS[DEFAULT_FORMAT]
    return FORMATS[scene.get('format',DEFAULT_FORMAT)]
def analysis_size(scene):
    """Reduced decode size for media analysis: 1/6 of the output (vertical 180x320, as before)."""
    w,h=dims(scene);return w//6,h//6
