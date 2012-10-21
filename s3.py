BUCKET = 'media.swarmation.com'
#HOST = 'djdtqy87hg7ce.cloudfront.net'
HOST = 'media.swarmation.com'
ORIGIN = 'http://swarmation.com/,http://beta.swarmation.com/,http://www2.swarmation.com/,http://test.swarmation.com/'

from config import AMAZON_ID, AMAZON_KEY
AMAZON_BUCKET = BUCKET

ROOT = 'public'
EXCLUDE = []
MASTER_FILES = []

DEPENDENCIES = {
    '.css': '.html',
    '.js': '.html',
    '.png': '.js',
    '.png': '.css',
    '.gif': '.css',
    '.jpg': '.css',
    '.swf': '.html',
}

TYPES = {
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.swf': 'application/x-shockwave-flash',
    }

NO_REVISION = [ 'public/images/formations' ]

MINIFY = {
    #  --compilation_level ADVANCED_OPTIMIZATIONS
#    '.js': 'java -jar contrib/closure.jar --js %(file)s',
#    '.js': 'java -jar contrib/jquery/build/yuicompressor-2.4.2.jar --type js',
#    '.css': 'java -jar contrib/yuicompressor.jar --type css',
}

GZIP_TYPES = ['.js', '.css', '.ttf', '.otf']

def download(url):
    from urllib import urlopen
    def _download(path):
        return urlopen(url).read()
    return _download

OVERRIDES = {
}

FORCE = False
import sys
if len(sys.argv) > 1 and sys.argv[1] == '--force':
    FORCE = True


from boto.s3.connection import S3Connection
from boto.s3.key import Key
from path import path
from datetime import datetime, timedelta
import os
import re

def multiReplaceCompile(dict):
    r = '|'.join(map(re.escape, dict))
    r = r.replace('\\*', '.')
    return re.compile(r)

def multiReplace(text, dict, rc=None):
    """
    take a text and replace words that match a key in a dictionary with
    the associated value, return the changed text
    """
    if not rc: rc = multiReplaceCompile(dict)
    def translate(match):
        if match.group(0).startswith('http://'):
            return dict[path(match.group(0)).stripext().stripext() + '.****' + path(match.group(0)).ext]
        else:
            return dict[match.group(0)]
    return rc.sub(translate, text)

def cleanup():
    for k in bucket.list():
        path = root + '/' + k.key
        if not os.path.isfile(path):
            print 'Deleting key %s' % k.key
            k.delete()

def compress(s):
    import cStringIO, gzip
    zbuf = cStringIO.StringIO()
    zfile = gzip.GzipFile(mode='wb', compresslevel=6, fileobj=zbuf)
    zfile.write(s)
    zfile.close()
    return zbuf.getvalue()

from hashlib import sha1
def revisionId(file, content=None, length=4):
    s = sha1()
    s.update(content or file.bytes())
    return s.hexdigest()[:length]

def localPath(file, root):
    return '/%s' % root.relpathto(file)
def remotePath(file, root, content=None):
    if file.dirname() in NO_REVISION:
        return '/%s' % root.relpathto(file).stripext() + file.ext
    else:
        return '/%s' % root.relpathto(file).stripext() + '.' + revisionId(file, content) + file.ext

def listFiles(dir, extensions=[], exclude=[]):
    dirs = [listFiles(subdir, extensions, exclude) for subdir in dir.dirs() if subdir not in exclude]
    return [f for f in dir.files() if f.ext in extensions] + reduce(lambda a,b: a+b, dirs, [])

def loadFile(file, overrides):
    return file, overrides[file](file) if file in overrides else file.bytes()

def getMap(root, files):
    return dict([(localPath(file[0], root), remotePath(file[0], root, content=file[1])) for file in files])

def processFiles(files, map, linkers, root):
    mapc = multiReplaceCompile(map)
    return [(name, map[localPath(name, root)], processContent(content, map, mapc) if name.ext in linkers else content)
            for name,content
            in files
            ]

def processContent(content, map, mapc):
    return multiReplace(content, map, mapc)

def getBucket():
    conn = S3Connection(AMAZON_ID, AMAZON_KEY)
    bucket = conn.create_bucket(AMAZON_BUCKET)
    bucket.set_acl('public-read')
    return bucket

def skipExisting(files, map, bucket, root):
    if FORCE: return files
    return [f for f in files if not bucket.get_key(map[localPath(f[0], root)])]

def uploadFiles(files, bucket):
    for local, remote, content in files:
        uploadFile(local, remote, content, bucket)

def minify(content, type):
    minifier = MINIFY[type]
    if '%(file)s' in minifier:
        path('tmp').write_bytes(content)
        stdin, stdout = os.popen2(minifier % dict(file='tmp'))
    else:
        stdin, stdout = os.popen2(minifier)
        stdin.write(content)
    stdin.close()
    content = stdout.read()
    stdout.close()
    if '%(file)s' in minifier:
        path('tmp').remove()
    return content

def uploadFile(local, remote, content, bucket):
    k = Key(bucket)
    k.key = remote

    headers = {}
    headers['Content-Type'] = TYPES[local.ext]
    headers['Access-Control-Allow-Origin'] = ORIGIN
    headers['Expires'] = (datetime.utcnow() + timedelta(days=365)).strftime('%a, %d %b %Y %H:%M:%S GMT')
    headers['Cache-Control'] = 'max-age=%d' % (30*24*60*60)

    if local.ext in MINIFY:
        content = minify(content, local.ext)

    if local.ext in GZIP_TYPES:
        content = compress(content)
        headers['Content-Encoding'] = 'gzip'

    print 'Uploading file %s as %s %s...' % (local, remote, headers)
    k.set_contents_from_string(content, headers, policy='public-read', replace=True)

def processLocalHtml(root, map, host):
    rep = {}
    for k, v in map.items():
        rep[k] = 'http://%s%s' % (host, v)
        rep['http://%s%s.****%s' % (host, path(v).stripext().stripext(), path(v).ext)] = 'http://%s%s' % (host, v)
    repc = multiReplaceCompile(rep)
    for file in listFiles(root, extensions=['.html'], exclude=EXCLUDE):
        file.write_bytes(multiReplace(file.bytes(), rep, repc))

def main():
    root = path(ROOT)
    overrides = dict([(path(p),f) for p, f in OVERRIDES.items()])

    linked = set(DEPENDENCIES.keys())
    linkers = set(DEPENDENCIES.values())

    file_list = listFiles(root, extensions=linked, exclude=EXCLUDE) + [path(f) for f in overrides.keys()]
    files = [loadFile(f, overrides) for f in file_list]
    map = getMap(root, files)
    bucket = getBucket()
    files = skipExisting(files, map, bucket, root)
    for f in files:
        print f[0], map['/' + root.relpathto(f[0])]
    processed_files = processFiles(files, map, linkers, root)
    uploadFiles(processed_files, bucket)
    processLocalHtml(root, map, HOST)

if __name__=='__main__':
    main()
