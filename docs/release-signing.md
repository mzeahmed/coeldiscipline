# Release signing

Release builds are signed with a personal key that is never committed. Without it,
`make install` and the CI release build fail on purpose.

**Keep a backup of the keystore and its password.** Losing them means the next APK
cannot update the installed app: it must be uninstalled, which erases its data.

## 1. Create the key (once)

```bash
mkdir -p ~/keys && chmod 700 ~/keys
keytool -genkeypair -v -keystore ~/keys/coeldiscipline-release.keystore \
  -alias coeldiscipline -keyalg RSA -keysize 4096 -validity 10000
chmod 600 ~/keys/coeldiscipline-release.keystore
```

`keytool` prompts for a password. With the default PKCS12 format, the key password
is the same as the store password.

## 2. Local builds

Add to `~/.gradle/gradle.properties` (outside the repository), using an absolute
path:

```properties
COELDISCIPLINE_STORE_FILE=/home/<user>/keys/coeldiscipline-release.keystore
COELDISCIPLINE_STORE_PASSWORD=<password>
COELDISCIPLINE_KEY_ALIAS=coeldiscipline
COELDISCIPLINE_KEY_PASSWORD=<password>
```

Then run `chmod 600 ~/.gradle/gradle.properties`.

An app previously installed with another key must be removed once
(`adb uninstall com.coeldiscipline`). **This erases its data.**

## 3. GitHub Actions

In the repository, open Settings, Secrets and variables, Actions, and create:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | output of `base64 -w0 ~/keys/coeldiscipline-release.keystore` |
| `ANDROID_STORE_PASSWORD` | the password |
| `ANDROID_KEY_ALIAS` | `coeldiscipline` |
| `ANDROID_KEY_PASSWORD` | the password |

Or with the GitHub CLI, after `gh auth login`:

```bash
base64 -w0 ~/keys/coeldiscipline-release.keystore | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_STORE_PASSWORD     # prompts for the value
gh secret set ANDROID_KEY_ALIAS --body coeldiscipline
gh secret set ANDROID_KEY_PASSWORD       # prompts for the value
```
