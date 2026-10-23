# Putting SimpleHome on your TV

This is the process that worked on a 2016 Samsung UE55KU7350 (Tizen 2.4, firmware 1260). Newer Samsung TVs follow the same steps, but this app is written for older ones.

Installing a developer app is safe: it doesn't change the TV's firmware, and you can remove it like any other app.

## 1. Turn on Developer Mode

1. Find your PC's local IP address (Windows: `ipconfig`, the *IPv4 Address* of your Wi-Fi or Ethernet adapter).
2. On the TV, press **Home** and open **Apps**.
3. On the Apps screen, type **1 2 3 4 5**. Remotes without number buttons: press **123** (or **…**) for the on-screen number pad, or use the remote in the SmartThings phone app.
4. Switch **Developer mode** on and enter your PC's IP as **Host PC IP**. It must be exactly right; a wrong IP was the cause of a failed connection here.
5. **Unplug the TV for 30 seconds.** Turning it off with the remote only puts it in standby, and Developer Mode needs a full restart.
6. *Developer Mode* now shows at the top of the Apps screen.

Find the TV's own IP under **Settings → General → Network → Network Status → IP Settings**. PC and TV must be on the same network.

## 2. Install Tizen Studio

Download **Tizen Studio with IDE installer** (the `web-ide` version is enough) from [Samsung's TV SDK page](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html). Install it to a path without spaces, such as `C:\tizen-studio`. In the Package Manager's **Extension SDK** tab, install **TV Extensions** (and **Samsung Certificate Extension** for newer TVs).

Check the connection:

```sh
C:\tizen-studio\tools\sdb.exe connect 192.168.1.50
C:\tizen-studio\tools\sdb.exe devices
```

The TV should be listed with its model name.

## 3. Create a signing profile

**On 2016-era TVs (Tizen 2.x), use a Tizen certificate.** Samsung certificates made by current Tizen Studio fail with `install failed[118]` on these TVs, even for a blank test app, because the old firmware doesn't trust the newer certificate chain. A plain Tizen author certificate works:

```sh
C:\tizen-studio\tools\ide\bin\tizen.bat certificate -a mytv -p YOUR_PASSWORD -f author -- C:\Users\you\SamsungCertificate\TizenTV
C:\tizen-studio\tools\ide\bin\tizen.bat security-profiles add -n TizenTV -a C:\Users\you\SamsungCertificate\TizenTV\author.p12 -p YOUR_PASSWORD
```

**On newer TVs**, use Tizen Studio's **Tools → Certificate Manager**, choose **Samsung** and **TV**, sign in with a Samsung account, pick **Public**, and add the TV's DUID (`sdb shell 0 getduid`) to the distributor certificate.

**Back up the certificate folder** (to a USB stick rather than a synced cloud folder, since it holds your private key). Updates must be signed with the same certificate, or you'll have to uninstall first and lose your settings.

## 4. Build and install

```sh
python scripts/build.py --profile TizenTV --tv 192.168.1.50 --install --run
```

Run it again after any change. Updates keep your saved settings.

## 5. Open SimpleHome when the TV turns on

Older Samsung TVs don't let apps start themselves at power-on, but the TV can reopen the last app used:

1. **Settings → General → Smart Features**: turn **Autorun Last App** on and **Autorun Smart Hub** off.
2. Open SimpleHome and turn the TV off with the remote. It comes back on in SimpleHome.

Watch Live TV and HDMI from inside SimpleHome so it stays the last app. After Netflix or YouTube, press Back to return to SimpleHome before turning off. If the TV ever forgets after a full power cut, move SimpleHome to the front of the Samsung Home bar so it's one click away.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `failed to connect to remote target` | Host PC IP on the TV doesn't match this PC, or the TV hasn't been fully restarted since Developer Mode was turned on. |
| `install failed[118]` | Certificate rejected. On Tizen 2.x use a Tizen certificate (step 3). Also check `required_version` in `config.xml` isn't higher than the TV's Tizen version. |
| Icons black or layout broken | Your TV's browser lacks a CSS or JavaScript feature. SimpleHome avoids CSS variables, Promises and `document.fonts` for this reason; keep new code to ES5. |
| An app tile doesn't open | App IDs vary by model. Find the right one with `sdb shell 0 vd_applist` and add it to `KNOWN` in `app/main.js`. |
| TV disappears from `sdb devices` | It went to standby. Turn it on and run `sdb connect` again. |

To see errors from the TV while developing, have the app send `window.onerror` messages to a small HTTP server on your PC (add `<access origin="*"/>` and the `internet` privilege to `config.xml` while testing, and remove them afterwards). Remote web inspection didn't work on this TV.
