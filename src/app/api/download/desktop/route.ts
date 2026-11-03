import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function windowsBat(appUrl: string) {
  const url = appUrl.replace(/["<>|]/g, '');
  const lines = [
    '@echo off',
    'setlocal EnableExtensions',
    'title ZMKH Road Home',
    `set "APP_URL=${url}"`,
    'set "APP_NAME=ZMKH Road Home"',
    'set "EDGE="',
    'if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" set "EDGE=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"',
    'if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" set "EDGE=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"',
    'set "CHROME="',
    'if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"',
    'if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"',
    'set "BROWSER=%EDGE%"',
    'if not defined BROWSER set "BROWSER=%CHROME%"',
    'if not defined BROWSER (',
    '  echo Edge or Chrome is required.',
    '  start "" "%APP_URL%"',
    '  pause',
    '  exit /b 1',
    ')',
    'powershell -NoProfile -ExecutionPolicy Bypass -Command "& { param([string]$Browser,[string]$Url) $name=\'ZMKH Road Home\'; $w=New-Object -ComObject WScript.Shell; $places=@([Environment]::GetFolderPath(\'Desktop\'), (Join-Path ([Environment]::GetFolderPath(\'StartMenu\')) \'Programs\')); foreach($dir in $places){ if(-not (Test-Path $dir)){ New-Item -ItemType Directory -Path $dir | Out-Null }; $s=$w.CreateShortcut((Join-Path $dir ($name + \'.lnk\'))); $s.TargetPath=$Browser; $s.Arguments=(\'--app=\' + $Url + \' --start-maximized\'); $s.WindowStyle=1; $s.WorkingDirectory=$env:USERPROFILE; $s.Save() } }" "%BROWSER%" "%APP_URL%"',
    'start "" "%BROWSER%" --app="%APP_URL%" --start-maximized',
    'exit /b 0',
  ];
  return `${lines.join('\r\n')}\r\n`;
}

/** Public — login page download of a Windows desktop launcher. */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const body = windowsBat(origin);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ZMKH-Road-Home-Desktop.bat"',
      'Cache-Control': 'no-store',
    },
  });
}
