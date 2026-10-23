"""Package SimpleHome and, optionally, install and open it on a TV.

  python scripts/build.py --profile MyProfile
  python scripts/build.py --profile MyProfile --tv 192.168.1.50 --install --run

Needs Tizen Studio (https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html)
and a security profile made with it. See docs/setup.md.
"""
import argparse
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_ID = 'MyTvHome02.SimpleHome'


def tizen_studio():
    for path in (os.environ.get('TIZEN_STUDIO'), r'C:\tizen-studio', os.path.expanduser('~/tizen-studio')):
        if path and os.path.isdir(path):
            return path
    sys.exit('Tizen Studio not found. Install it, or set TIZEN_STUDIO to its folder.')


def run(cmd):
    print('>', ' '.join(cmd))
    out = subprocess.run(cmd, capture_output=True, text=True)
    text = out.stdout + out.stderr
    print(text.strip())
    if out.returncode != 0 or 'failed' in text.lower():
        sys.exit('Step failed.')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--profile', required=True, help='Tizen Studio security profile used to sign the app')
    ap.add_argument('--tv', help='TV IP address (Developer Mode must be on, with this PC as Host PC IP)')
    ap.add_argument('--install', action='store_true', help='install on the TV')
    ap.add_argument('--run', action='store_true', help='open the app on the TV after installing')
    a = ap.parse_args()

    studio = tizen_studio()
    tizen = os.path.join(studio, 'tools', 'ide', 'bin', 'tizen.bat' if os.name == 'nt' else 'tizen')
    sdb = os.path.join(studio, 'tools', 'sdb.exe' if os.name == 'nt' else 'sdb')

    build = os.path.join(ROOT, 'dist', 'build')
    shutil.rmtree(build, ignore_errors=True)
    shutil.copytree(os.path.join(ROOT, 'app'), build)
    run([tizen, 'package', '-t', 'wgt', '-s', a.profile, '--', build])
    wgt = os.path.join(build, 'SimpleHome.wgt')
    shutil.copy(wgt, os.path.join(ROOT, 'dist', 'SimpleHome.wgt'))
    print('Package:', os.path.join(ROOT, 'dist', 'SimpleHome.wgt'))

    if a.install or a.run:
        if not a.tv:
            sys.exit('--tv is needed to install.')
        target = a.tv if ':' in a.tv else a.tv + ':26101'
        run([sdb, 'connect', a.tv])
        if a.install:
            run([tizen, 'install', '-n', 'SimpleHome.wgt', '-s', target, '--', build])
        if a.run:
            run([tizen, 'run', '-p', APP_ID, '-s', target])


if __name__ == '__main__':
    main()
