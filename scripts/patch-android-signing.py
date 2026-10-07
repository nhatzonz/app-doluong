#!/usr/bin/env python3
"""Gan khoa ky release vao du an Android sau khi chay `expo prebuild`.

Chay lai moi lan prebuild (prebuild tao lai thu muc android/ nen mat cau hinh ky):
    npx expo prebuild -p android --clean
    python3 scripts/patch-android-signing.py
    cd android && ./gradlew assembleRelease

Khoa ky nam o credentials/doluong-release.keystore (da duoc .gitignore).
Mat khau doc tu bien moi truong DOLUONG_KEYSTORE_PASSWORD, mac dinh 'doluong2026'.
"""
import os
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
GRADLE = ROOT / 'android' / 'app' / 'build.gradle'
PROPS = ROOT / 'android' / 'gradle.properties'
KEYSTORE = ROOT / 'credentials' / 'doluong-release.keystore'
PASSWORD = os.environ.get('DOLUONG_KEYSTORE_PASSWORD', 'doluong2026')

if not GRADLE.exists():
    sys.exit('Chua co thu muc android/. Chay: npx expo prebuild -p android --clean')
if not KEYSTORE.exists():
    sys.exit(f'Khong thay khoa ky {KEYSTORE}. Xem huong dan trong README.')

text = GRADLE.read_text()
if 'DOLUONG_STORE_FILE' not in text:
    text = text.replace(
        """            keyPassword 'android'
        }
    }""",
        """            keyPassword 'android'
        }
        release {
            if (project.hasProperty('DOLUONG_STORE_FILE')) {
                storeFile file(DOLUONG_STORE_FILE)
                storePassword DOLUONG_STORE_PASSWORD
                keyAlias DOLUONG_KEY_ALIAS
                keyPassword DOLUONG_KEY_PASSWORD
            }
        }
    }""", 1)
    text = text.replace(
        """        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug""",
        """        release {
            signingConfig project.hasProperty('DOLUONG_STORE_FILE') ? signingConfigs.release : signingConfigs.debug""", 1)
    GRADLE.write_text(text)

props = PROPS.read_text()
if 'DOLUONG_STORE_FILE' not in props:
    props += (
        '\n# Khoa ky ban release (file nam ngoai android/ de prebuild khong xoa mat)\n'
        'DOLUONG_STORE_FILE=../../credentials/doluong-release.keystore\n'
        f'DOLUONG_STORE_PASSWORD={PASSWORD}\n'
        'DOLUONG_KEY_ALIAS=doluong\n'
        f'DOLUONG_KEY_PASSWORD={PASSWORD}\n'
    )
    PROPS.write_text(props)

print('Da gan khoa ky release vao du an Android.')
