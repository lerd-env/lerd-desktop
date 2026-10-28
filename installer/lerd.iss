; Inno Setup installer for lerd on Windows. It takes a machine with nothing on
; it to a running lerd: the WSL features (and the restart they need), WSL
; itself, an Ubuntu distro with a Linux user, lerd's own installer inside it,
; then `lerd wsl:setup`, which wires lerd into Windows. Every step checks before
; it acts, so running Setup again after a failure resumes where it stopped.
; Build with build.ps1, which generates the assets this script expects.

; The installer's own version. It installs whatever lerd release is latest, so
; this moves only when the installer changes; 0.x until it is stable.
#ifndef AppVersion
  #define AppVersion "0.1.0"
#endif

[Setup]
AppId={{6F2B7C1E-3D4A-4E8B-9C2F-1A5D8E7B4C30}
AppName=Lerd
AppVersion={#AppVersion}
VersionInfoVersion={#AppVersion}
; Without the version, which would read as lerd's own.
AppVerName=Lerd
AppPublisher=Lerd
AppPublisherURL=https://lerd.sh
AppSupportURL=https://github.com/lerd-env/lerd/issues
AppUpdatesURL=https://github.com/lerd-env/lerd/releases
DefaultDirName={autopf}\Lerd
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; WSL 2 needs Windows 10 2004 or newer.
MinVersion=10.0.19041
WizardStyle=modern
; Room for the details box under the progress bar.
WizardSizePercent=120
SetupIconFile=assets\lerd.ico
WizardImageFile=assets\wizard-0.bmp,assets\wizard-1.bmp,assets\wizard-2.bmp,assets\wizard-3.bmp,assets\wizard-4.bmp
WizardSmallImageFile=assets\wizard-small-0.bmp,assets\wizard-small-1.bmp,assets\wizard-small-2.bmp,assets\wizard-small-3.bmp,assets\wizard-small-4.bmp
LicenseFile=assets\LICENSE.txt
UninstallDisplayIcon={app}\lerd.ico
UninstallDisplayName=Lerd
OutputDir=dist
OutputBaseFilename=Install-Lerd
Compression=lzma2
SolidCompression=yes
SetupLogging=yes
CloseApplications=no
; lerd lives in the installing user's WSL, so its Windows side, the desktop
; app's registration included, goes under that user too.
UsedUserAreasWarning=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
PrepareToInstallNeedsRestart=Windows needs a restart to finish enabling WSL. Setup carries on by itself after you sign back in.%n%nWould you like to restart now?

[CustomMessages]
UserPageCaption=Linux user
UserPageDescription=Lerd runs inside an Ubuntu 24.04 WSL distro, under its own Linux user.
UserPageSub=Choose a name and a password for that user. sudo asks for this password inside Linux.
UserName=&Username:
UserPassword=&Password:
UserPasswordConfirm=&Confirm password:
BadUserName=The username must start with a lowercase letter and use only lowercase letters, digits and dashes, up to 32 characters.
ReservedUserName=%1 is already a system user in Ubuntu; choose another name.
EmptyPassword=Choose a password.
PasswordMismatch=The passwords do not match.
ReadyRestart=Setup will enable the Windows features WSL 2 runs on, then restart Windows. It carries on by itself after you sign back in.
ReadySteps=Setup will:
ReadyWSL=install WSL from github.com/microsoft/WSL
ReadyDistro=install the %1 distro
ReadyUser=create the Linux user %1
ReadyUserExisting=use the existing Linux user %1
ReadyLerd=install Podman and Lerd inside the distro
ReadyIntegration=connect Lerd with Windows: the lerd command and your site domains
ReadyApp=install the Lerd desktop app, which holds Lerd's tray icon and notifications
ReadyDNSManaged=serve sites at https://<name>.test with trusted certificates
ReadyDNSLocalhost=serve sites at http://<name>.localhost
ReadyNodeOff=leave Node.js to you
OptionsPageCaption=Options
OptionsPageDescription=How Lerd sets up your sites and Node.js.
OptionsPageSub=Both can be changed later, from the dashboard or the lerd command.
OptionDNS=Local domains:
OptionDNSManaged=https://<name>.test with trusted certificates (recommended)
OptionDNSLocalhost=http://<name>.localhost over plain HTTP, with no DNS or certificates
OptionNode=Let Lerd manage Node.js versions
OptionNodeHint=Lerd installs Node.js per project and puts node, npm and npx shims on PATH.
StepOptions=Applying your options...
StepCA=Trusting Lerd's certificate in Windows...
CAPrompt=Windows will now ask whether to install Lerd's certificate authority.%n%nChoose Yes, so your browsers trust your https://<name>.test sites.
CADeclined=The certificate was not installed, so browsers will warn on your https sites. Run lerd wsl:setup inside WSL to be asked again.
StepFeatures=Enabling the WSL features...
StepWSL=Installing WSL...
StepDownload=Downloading %1 (%2 of %3 MB)
StepDistro=Installing %1...
StepUser=Creating the Linux user %1...
StepPackages=Installing Podman and the packages Lerd needs...
ShowDetails=Show details
HideDetails=Hide details
StepLerd=Installing Lerd inside %1...
StepIntegration=Connecting Lerd with Windows...
StepStart=Starting Lerd...
StepNotify=Handing Lerd's notifications to the desktop app...
StepApp=Installing the Lerd desktop app...
ErrNoApp=No lerd-desktop-win32-%1.zip in the latest github.com/lerd-env/lerd-desktop release
ErrExit=%1 failed (exit code %2)
ErrWSLNotReady=WSL was installed but wsl.exe still does not report it
ErrDashboard=The dashboard did not answer on 127.0.0.1:7073 within 3 minutes
FailedHeading=Setup could not finish installing Lerd
FailedText=%1%n%nRun Setup again to resume from this step. The details are in the log:%n%2
DoneText=Lerd is running, and its icon is in the tray. Open a new terminal and the lerd command works from Windows too.%n%nYour sites live inside Linux, at \\wsl.localhost\%1\home\%2.%n%n★ If Lerd is useful to you, a GitHub star helps others find it.
OpenDashboard=Open Lerd
OpenGitHub=Star Lerd on GitHub (github.com/lerd-env/lerd)
UninstallQuestion=What should happen to the %1 distro?
UninstallQuestionText=Lerd lives in the %1 WSL distro, together with your projects and anything else you keep there.
UninstallKeepDistro=Keep the distro, remove only Lerd%nDatabases and Lerd's settings are kept for a later reinstall.
UninstallDeleteDistro=Delete the distro%nEverything in it goes, projects included.
UninstallConfirmDelete=This deletes %1 with every file in it, including your projects and databases. It cannot be undone.%n%nDelete it?
UninstallLerd=Removing Lerd from %1...
UninstallDistro=Deleting %1...
UninstallCA=Removing Lerd's certificate authority...
UninstallWindows=Removing Lerd from Windows...


[Files]
Source: "assets\lerd.ico"; DestDir: "{app}"; Flags: ignoreversion
; The logo Windows shows on lerd's notifications.
Source: "branding\icon-512.png"; DestDir: "{app}"; DestName: "lerd.png"; Flags: ignoreversion

[Icons]
; The desktop app is downloaded later, in InstallDesktopApp. The app id ties
; the shortcut to the app's own windows and notifications.
Name: "{userprograms}\Lerd"; Filename: "{app}\desktop\lerd-desktop.exe"; AppUserModelID: "sh.lerd.Lerd"

[UninstallDelete]
Type: filesandordirs; Name: "{commonappdata}\Lerd"
Type: filesandordirs; Name: "{app}\desktop"
Type: files; Name: "{app}\desktop.version"

[Run]
; runasoriginaluser so the app does not inherit Setup's admin rights. It is
; already running in the tray by then, and a second start shows its window.
Filename: "{app}\desktop\lerd-desktop.exe"; Description: "{cm:OpenDashboard}"; Flags: postinstall nowait runasoriginaluser skipifsilent; Check: Succeeded
; The same nudge install.sh's star_note prints at the end of a console install.
Filename: "https://github.com/lerd-env/lerd"; Description: "{cm:OpenGitHub}"; Flags: postinstall shellexec nowait runasoriginaluser skipifsilent unchecked; Check: Succeeded

[Code]
const
  Distro = 'Ubuntu-24.04';
  { lerd's installer asks sudo for its password, and Setup has no terminal to
    type it in, so the user gets passwordless sudo only while Setup runs. }
  SudoersDropIn = '/etc/sudoers.d/zz-lerd-setup';
  LxssKey = 'Software\Microsoft\Windows\CurrentVersion\Lxss';
  RunKey = 'Software\Microsoft\Windows\CurrentVersion\Run';
  { Lerd's own settings: the thumbprint of the CA Setup trusted, for uninstall. }
  LerdKey = 'Software\Lerd';
  { The AppUserModelID lerd's own toasts use, shared by the desktop app. }
  ToastAppID = 'sh.lerd.Lerd';

var
  UserPage: TInputQueryWizardPage;
  FeaturesOn: Boolean;
  LinuxUser: String;
  UserExists: Boolean;
  LerdInstalled: Boolean;
  OptionsPage: TWizardPage;
  DNSManaged, DNSLocalhost: TNewRadioButton;
  ManageNode: TNewCheckBox;
  Failed: String;
  DeleteDistro: Boolean;
  DetailMemo: TNewMemo;
  DetailsButton: TNewButton;
  DownloadName: String;

function SetEnvironmentVariable(lpName, lpValue: String): BOOL;
  external 'SetEnvironmentVariableW@kernel32.dll stdcall';

function EnableWindow(hWnd: HWND; bEnable: BOOL): BOOL;
  external 'EnableWindow@user32.dll stdcall';

{ ---- running commands ---------------------------------------------------- }

{ RealWSLExe is where the WSL package installs wsl.exe. The one in System32 is
  a stub until then, and asked anything it opens its own window offering to
  install or update WSL, which can sit waiting for a key behind Setup. }
function RealWSLExe: String;
begin
  Result := ExpandConstant('{commonpf64}\WSL\wsl.exe');
end;

function WSLExe: String;
begin
  if FileExists(RealWSLExe) then
    Result := RealWSLExe
  else
    Result := ExpandConstant('{sys}\wsl.exe');
end;

function PowerShellExe: String;
begin
  Result := ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe');
end;

{ Quote escapes S as one argument for the CommandLineToArgvW rules wsl.exe and
  powershell.exe parse their command line with. }
function Quote(const S: String): String;
var
  I, J, N: Integer;
begin
  Result := '"';
  N := 0;
  for I := 1 to Length(S) do
  begin
    if S[I] = '\' then
      N := N + 1
    else
    begin
      if S[I] = '"' then
        for J := 0 to N do
          Result := Result + '\';
      N := 0;
    end;
    Result := Result + S[I];
  end;
  for J := 1 to N do
    Result := Result + '\';
  Result := Result + '"';
end;

function PSParams(const Script: String): String;
begin
  Result := '-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ' +
    Quote('$ProgressPreference = ''SilentlyContinue''; ' + Script);
end;

{ Detached wraps a script so nothing in it can wait on a terminal. Setup's hidden
  console still makes WSL give Linux a pty, where a question read from /dev/tty
  would wait forever for an answer nobody can type. In a new session with no
  controlling terminal, /dev/tty fails to open and every question takes its
  default. }
function Detached(const Shell, Script: String): String;
begin
  Result := '--exec setsid -w ' + Shell + ' ' + Quote('{' + #10 + Script + #10 + '} </dev/null');
end;

{ --exec rather than --, which would hand the script to the user's shell first. }
function AsRoot(const Script: String): String;
begin
  Result := '-d ' + Distro + ' -u root ' + Detached('sh -c', Script);
end;

function AsUser(const Script: String): String;
begin
  Result := '-d ' + Distro + ' -u ' + LinuxUser + ' --cd ~ ' + Detached('bash -lc', Script);
end;

{ CaptureLines runs a command hidden and returns its trimmed output lines. wsl.exe
  writes UTF-16 unless WSL_UTF8 is set, which the inbox stub ignores, so stray
  NULs are dropped either way. }
function CaptureLines(const Exe, Params: String; var Lines: TArrayOfString): Integer;
var
  Output: TExecOutput;
  I: Integer;
  L: String;
begin
  SetArrayLength(Lines, 0);
  if not ExecAndCaptureOutput(Exe, Params, '', SW_HIDE, ewWaitUntilTerminated, Result, Output) then
  begin
    Log(Format('Could not run %s: %s', [Exe, SysErrorMessage(Result)]));
    Result := -1;
    Exit;
  end;
  for I := 0 to GetArrayLength(Output.StdOut) - 1 do
  begin
    L := Output.StdOut[I];
    StringChangeEx(L, #0, '', True);
    L := Trim(L);
    if L <> '' then
    begin
      SetArrayLength(Lines, GetArrayLength(Lines) + 1);
      Lines[GetArrayLength(Lines) - 1] := L;
    end;
  end;
end;

function StripAnsi(const S: String): String;
var
  I: Integer;
  Skip: Boolean;
begin
  Result := '';
  Skip := False;
  for I := 1 to Length(S) do
    if S[I] = #27 then
      Skip := True
    else if Skip then
      Skip := not (((S[I] >= 'A') and (S[I] <= 'Z')) or ((S[I] >= 'a') and (S[I] <= 'z')))
    else if S[I] >= ' ' then
      Result := Result + S[I];
end;

{ AddDetail appends a line to the details box under the progress bar, keeping
  the last 1000 lines and the newest one in view. }
procedure AddDetail(const S: String);
begin
  if DetailMemo = nil then
    Exit;
  DetailMemo.Lines.Add(S);
  while DetailMemo.Lines.Count > 1000 do
    DetailMemo.Lines.Delete(0);
  SendMessage(DetailMemo.Handle, $00B6 { EM_LINESCROLL }, 0, DetailMemo.Lines.Count);
end;

{ SetStatus names the step under way, above the progress bar and as a heading
  in the details box. }
procedure SetStatus(const S: String);
begin
  if IsUninstaller or (WizardForm.StatusLabel.Caption = S) then
    Exit;
  WizardForm.StatusLabel.Caption := S;
  WizardForm.FilenameLabel.Caption := '';
  if DetailMemo.Lines.Count > 0 then
    AddDetail('');
  AddDetail('==> ' + S);
end;

procedure ShowOutput(const S: String; const Error, FirstLine: Boolean);
var
  L: String;
begin
  L := TrimRight(StripAnsi(S));
  StringChangeEx(L, #0, '', True);
  if Trim(L) = '' then
    Exit;
  Log(L);
  if IsUninstaller then
    UninstallProgressForm.StatusLabel.Caption := Trim(L)
  else
  begin
    WizardForm.FilenameLabel.Caption := Trim(L);
    AddDetail(L);
    { Inno disables the wizard while a command runs, which would leave Show
      details dead for the whole install. Cancel is disabled on its own, so
      nothing else becomes clickable. }
    EnableWindow(WizardForm.Handle, True);
  end;
end;

{ Run runs a step's command hidden, streaming its output under the progress bar
  and into the log. On failure it records why in Failed. }
function Run(const Status, Exe, Params: String): Boolean;
var
  Code: Integer;
begin
  SetStatus(Status);
  Log('Running: ' + Exe + ' ' + Params);
  Result := ExecAndLogOutput(Exe, Params, '', SW_HIDE, ewWaitUntilTerminated, Code, @ShowOutput) and (Code = 0);
  if not Result then
    Failed := FmtMessage(CustomMessage('ErrExit'), [Status, IntToStr(Code)]);
end;

function PowerShell(const Script: String; var Lines: TArrayOfString): Boolean;
begin
  Result := CaptureLines(PowerShellExe, PSParams(Script), Lines) = 0;
end;

{ ---- state checks -------------------------------------------------------- }

function WSLFeaturesEnabled: Boolean;
var
  Lines: TArrayOfString;
begin
  Result := PowerShell('foreach ($f in ''Microsoft-Windows-Subsystem-Linux'', ''VirtualMachinePlatform'') { (Get-WindowsOptionalFeature -Online -FeatureName $f).State }', Lines)
    and (GetArrayLength(Lines) = 2) and (Lines[0] = 'Enabled') and (Lines[1] = 'Enabled');
end;

{ IsVersion reports whether a `wsl --version` line ends in an a.b.c.d version. Its
  labels are translated, and the inbox stub never prints one. }
function IsVersion(const L: String): Boolean;
var
  I, Dots: Integer;
  V: String;
  AfterDot: Boolean;
begin
  Result := False;
  I := Length(L);
  while (I > 0) and (L[I] <> ':') do
    I := I - 1;
  if I = 0 then
    Exit;
  V := Trim(Copy(L, I + 1, Length(L)));
  Dots := 0;
  AfterDot := True;
  for I := 1 to Length(V) do
    if V[I] = '.' then
    begin
      if AfterDot then
        Exit;
      Dots := Dots + 1;
      AfterDot := True;
    end
    else if (V[I] >= '0') and (V[I] <= '9') then
      AfterDot := False
    else
      Exit;
  Result := (Dots = 3) and not AfterDot;
end;

function WSLInstalled: Boolean;
var
  Lines: TArrayOfString;
begin
  Result := FileExists(RealWSLExe) and (CaptureLines(RealWSLExe, '--version', Lines) = 0) and
    (GetArrayLength(Lines) > 0) and IsVersion(Lines[0]);
end;

function DistroInstalled: Boolean;
var
  Lines: TArrayOfString;
  I: Integer;
begin
  Result := False;
  if not FileExists(RealWSLExe) or (CaptureLines(RealWSLExe, '-l -q', Lines) <> 0) then
    Exit;
  for I := 0 to GetArrayLength(Lines) - 1 do
    if CompareText(Lines[I], Distro) = 0 then
      Result := True;
end;

{ ExistingUser returns the distro's uid 1000 user, the one Setup creates. }
function ExistingUser: String;
var
  Lines: TArrayOfString;
begin
  Result := '';
  if (CaptureLines(WSLExe, '-d ' + Distro + ' -u root --exec id -nu 1000', Lines) = 0) and (GetArrayLength(Lines) > 0) then
    Result := Lines[0];
end;

{ LerdInstalledFor reports whether lerd is already in the user's ~/.local/bin, in
  which case it keeps the choices it settled on and Setup does not ask again. }
function LerdInstalledFor(const User: String): Boolean;
var
  Lines: TArrayOfString;
begin
  Result := CaptureLines(WSLExe, '-d ' + Distro + ' -u ' + User + ' --cd ~ ' + Detached('sh -c', 'test -x ~/.local/bin/lerd'), Lines) = 0;
end;

function ResumeRun: Boolean;
var
  I: Integer;
begin
  Result := False;
  for I := 1 to ParamCount do
    if CompareText(ParamStr(I), '/resume') = 0 then
      Result := True;
end;

{ LinuxUsername derives a valid Linux login from a Windows user name, as
  winshim.LinuxUsername does for lerd.exe's own setup. }
function LinuxUsername(const Windows: String): String;
var
  I: Integer;
  C: Char;
begin
  Result := '';
  for I := 1 to Length(Windows) do
  begin
    C := LowerCase(Windows[I])[1];
    if ((C >= 'a') and (C <= 'z')) or ((C >= '0') and (C <= '9')) or (C = '-') then
      Result := Result + C;
  end;
  if Result = '' then
    Result := 'lerd'
  else if (Result[1] < 'a') or (Result[1] > 'z') then
    Result := 'u' + Result;
  Result := Copy(Result, 1, 32);
end;

function ValidUsername(const U: String): Boolean;
var
  I: Integer;
begin
  Result := (Length(U) > 0) and (Length(U) <= 32) and (U[1] >= 'a') and (U[1] <= 'z');
  for I := 1 to Length(U) do
    if not (((U[I] >= 'a') and (U[I] <= 'z')) or ((U[I] >= '0') and (U[I] <= '9')) or (U[I] = '-')) then
      Result := False;
end;

function ReservedUsername(const U: String): Boolean;
begin
  Result := Pos(' ' + U + ' ', ' root daemon bin sys sync games man lp mail news uucp proxy www-data backup list irc nobody systemd-network systemd-resolve messagebus syslog ubuntu ') > 0;
end;

{ ---- wizard -------------------------------------------------------------- }

function InitializeSetup: Boolean;
begin
  SetEnvironmentVariable('WSL_UTF8', '1');
  Result := True;
end;

{ CreateOptionsPage asks up front what lerd's installers would ask along the way,
  where Setup has no terminal to show them. }
procedure CreateOptionsPage(AfterID: Integer);
var
  Lbl, Hint: TNewStaticText;
begin
  OptionsPage := CreateCustomPage(AfterID, CustomMessage('OptionsPageCaption'), CustomMessage('OptionsPageDescription'));

  Lbl := TNewStaticText.Create(OptionsPage);
  Lbl.Parent := OptionsPage.Surface;
  Lbl.Caption := CustomMessage('OptionDNS');
  Lbl.Font.Style := [fsBold];

  DNSManaged := TNewRadioButton.Create(OptionsPage);
  DNSManaged.Parent := OptionsPage.Surface;
  DNSManaged.Top := Lbl.Top + Lbl.Height + ScaleY(8);
  DNSManaged.Width := OptionsPage.SurfaceWidth;
  DNSManaged.Height := ScaleY(20);
  DNSManaged.Caption := CustomMessage('OptionDNSManaged');
  DNSManaged.Checked := True;

  DNSLocalhost := TNewRadioButton.Create(OptionsPage);
  DNSLocalhost.Parent := OptionsPage.Surface;
  DNSLocalhost.Top := DNSManaged.Top + DNSManaged.Height + ScaleY(4);
  DNSLocalhost.Width := OptionsPage.SurfaceWidth;
  DNSLocalhost.Height := ScaleY(20);
  DNSLocalhost.Caption := CustomMessage('OptionDNSLocalhost');

  ManageNode := TNewCheckBox.Create(OptionsPage);
  ManageNode.Parent := OptionsPage.Surface;
  ManageNode.Top := DNSLocalhost.Top + DNSLocalhost.Height + ScaleY(24);
  ManageNode.Width := OptionsPage.SurfaceWidth;
  ManageNode.Height := ScaleY(20);
  ManageNode.Caption := CustomMessage('OptionNode');
  ManageNode.Checked := True;

  Hint := TNewStaticText.Create(OptionsPage);
  Hint.Parent := OptionsPage.Surface;
  Hint.Top := ManageNode.Top + ManageNode.Height + ScaleY(2);
  Hint.Left := ScaleX(18);
  Hint.Width := OptionsPage.SurfaceWidth - Hint.Left;
  Hint.AutoSize := False;
  Hint.WordWrap := True;
  Hint.Height := ScaleY(30);
  Hint.Caption := CustomMessage('OptionNodeHint');

  Lbl := TNewStaticText.Create(OptionsPage);
  Lbl.Parent := OptionsPage.Surface;
  Lbl.Top := Hint.Top + Hint.Height + ScaleY(16);
  Lbl.Width := OptionsPage.SurfaceWidth;
  Lbl.AutoSize := False;
  Lbl.WordWrap := True;
  Lbl.Height := ScaleY(30);
  Lbl.Caption := CustomMessage('OptionsPageSub');
end;

procedure DetailsButtonClick(Sender: TObject);
begin
  DetailMemo.Visible := not DetailMemo.Visible;
  if DetailMemo.Visible then
    DetailsButton.Caption := CustomMessage('HideDetails')
  else
    DetailsButton.Caption := CustomMessage('ShowDetails');
end;

procedure InitializeWizard;
begin
  FeaturesOn := WSLFeaturesEnabled;
  if FeaturesOn and WSLInstalled and DistroInstalled then
    LinuxUser := ExistingUser;
  UserExists := LinuxUser <> '';
  LerdInstalled := UserExists and LerdInstalledFor(LinuxUser);

  UserPage := CreateInputQueryPage(wpLicense, CustomMessage('UserPageCaption'),
    CustomMessage('UserPageDescription'), CustomMessage('UserPageSub'));
  UserPage.Add(CustomMessage('UserName'), False);
  UserPage.Add(CustomMessage('UserPassword'), True);
  UserPage.Add(CustomMessage('UserPasswordConfirm'), True);
  UserPage.Values[0] := LinuxUsername(GetUserNameString);

  CreateOptionsPage(UserPage.ID);

  { The status line above the progress bar is enough for most installs; the
    full output stays one click away. }
  DetailsButton := TNewButton.Create(WizardForm);
  DetailsButton.Parent := WizardForm.InstallingPage;
  DetailsButton.Left := WizardForm.ProgressGauge.Left;
  DetailsButton.Top := WizardForm.ProgressGauge.Top + WizardForm.ProgressGauge.Height + ScaleY(12);
  DetailsButton.Width := ScaleX(110);
  DetailsButton.Height := WizardForm.NextButton.Height;
  DetailsButton.Caption := CustomMessage('ShowDetails');
  DetailsButton.OnClick := @DetailsButtonClick;

  DetailMemo := TNewMemo.Create(WizardForm);
  DetailMemo.Parent := WizardForm.InstallingPage;
  DetailMemo.Visible := False;
  DetailMemo.Left := WizardForm.ProgressGauge.Left;
  DetailMemo.Top := DetailsButton.Top + DetailsButton.Height + ScaleY(8);
  DetailMemo.Width := WizardForm.ProgressGauge.Width;
  DetailMemo.Height := WizardForm.InstallingPage.ClientHeight - DetailMemo.Top;
  DetailMemo.Anchors := [akLeft, akTop, akRight, akBottom];
  DetailMemo.ReadOnly := True;
  DetailMemo.WordWrap := True;
  DetailMemo.ScrollBars := ssVertical;
  DetailMemo.Font.Name := 'Consolas';
  DetailMemo.Font.Size := 8;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  if ((PageID = wpWelcome) or (PageID = wpLicense)) and ResumeRun then
    Result := True;
  { The user is asked for after the restart, so it is not typed twice. }
  if (PageID = UserPage.ID) and (not FeaturesOn or UserExists) then
    Result := True;
  if (PageID = OptionsPage.ID) and (not FeaturesOn or LerdInstalled) then
    Result := True;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  U: String;
begin
  Result := True;
  if CurPageID <> UserPage.ID then
    Exit;
  U := Trim(UserPage.Values[0]);
  if not ValidUsername(U) then
    MsgBox(CustomMessage('BadUserName'), mbError, MB_OK)
  else if ReservedUsername(U) then
    MsgBox(FmtMessage(CustomMessage('ReservedUserName'), [U]), mbError, MB_OK)
  else if UserPage.Values[1] = '' then
    MsgBox(CustomMessage('EmptyPassword'), mbError, MB_OK)
  else if UserPage.Values[1] <> UserPage.Values[2] then
    MsgBox(CustomMessage('PasswordMismatch'), mbError, MB_OK)
  else
  begin
    LinuxUser := U;
    Exit;
  end;
  Result := False;
end;

function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo, MemoTypeInfo,
  MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
begin
  if not FeaturesOn then
  begin
    Result := CustomMessage('ReadyRestart');
    Exit;
  end;
  Result := CustomMessage('ReadySteps') + NewLine;
  if not WSLInstalled then
    Result := Result + Space + '- ' + CustomMessage('ReadyWSL') + NewLine;
  if not DistroInstalled then
    Result := Result + Space + '- ' + FmtMessage(CustomMessage('ReadyDistro'), [Distro]) + NewLine;
  if UserExists then
    Result := Result + Space + '- ' + FmtMessage(CustomMessage('ReadyUserExisting'), [LinuxUser]) + NewLine
  else
    Result := Result + Space + '- ' + FmtMessage(CustomMessage('ReadyUser'), [LinuxUser]) + NewLine;
  Result := Result + Space + '- ' + CustomMessage('ReadyLerd') + NewLine;
  if not LerdInstalled then
  begin
    if DNSLocalhost.Checked then
      Result := Result + Space + '- ' + CustomMessage('ReadyDNSLocalhost') + NewLine
    else
      Result := Result + Space + '- ' + CustomMessage('ReadyDNSManaged') + NewLine;
    if not ManageNode.Checked then
      Result := Result + Space + '- ' + CustomMessage('ReadyNodeOff') + NewLine;
  end;
  Result := Result + Space + '- ' + CustomMessage('ReadyIntegration') + NewLine;
  Result := Result + Space + '- ' + CustomMessage('ReadyApp');
end;

{ PrepareToInstall enables the WSL features. They only take effect after a
  restart, so Setup registers itself to resume at the next login and stops
  here, which makes Inno offer the restart. }
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Lines: TArrayOfString;
  Resume: String;
begin
  Result := '';
  if FeaturesOn then
    Exit;
  WizardForm.PreparingLabel.Caption := CustomMessage('StepFeatures');
  if not PowerShell('Enable-WindowsOptionalFeature -Online -NoRestart -All -FeatureName Microsoft-Windows-Subsystem-Linux, VirtualMachinePlatform | Out-Null', Lines) then
  begin
    Result := FmtMessage(CustomMessage('ErrExit'), [CustomMessage('StepFeatures'), '1']);
    Exit;
  end;
  { The downloaded Setup may not be where it was after the restart. }
  Resume := ExpandConstant('{commonappdata}\Lerd\Install-Lerd.exe');
  ForceDirectories(ExtractFileDir(Resume));
  if not CopyFile(ExpandConstant('{srcexe}'), Resume, False) then
    Resume := ExpandConstant('{srcexe}');
  RegWriteStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\RunOnce', 'lerd-setup',
    '"' + Resume + '" /resume');
  NeedsRestart := True;
  Result := CustomMessage('ReadyRestart');
end;

{ ---- install steps ------------------------------------------------------- }

function DownloadProgress(const Url, FileName: String; const Progress, ProgressMax: Int64): Boolean;
begin
  if ProgressMax > 0 then
    WizardForm.FilenameLabel.Caption := FmtMessage(CustomMessage('StepDownload'), [DownloadName,
      IntToStr(Progress div 1048576), IntToStr(ProgressMax div 1048576)]);
  Result := True;
end;

{ EnsureWSL installs WSL from Microsoft's GitHub release. The wsl.exe Windows
  ships is a stub, and its Store-based install is unreliable. }
function EnsureWSL: Boolean;
var
  Lines: TArrayOfString;
  Arch, Msi: String;
  Code, I: Integer;
begin
  Result := WSLInstalled;
  if Result then
    Exit;
  SetStatus(CustomMessage('StepWSL'));
  if IsArm64 then
    Arch := 'arm64'
  else
    Arch := 'x64';
  if not PowerShell('[Net.ServicePointManager]::SecurityProtocol = ''Tls12''; ' +
    '(Invoke-RestMethod https://api.github.com/repos/microsoft/WSL/releases/latest).assets | ' +
    'Where-Object { $_.name -like ''*.' + Arch + '.msi'' } | Select-Object -First 1 -ExpandProperty browser_download_url', Lines)
    or (GetArrayLength(Lines) = 0) then
  begin
    Failed := 'No WSL ' + Arch + ' MSI found in the latest github.com/microsoft/WSL release';
    Exit;
  end;
  AddDetail('Downloading ' + Lines[0]);
  DownloadName := 'WSL';
  try
    DownloadTemporaryFile(Lines[0], 'lerd-wsl.msi', '', @DownloadProgress);
  except
    Failed := GetExceptionMessage;
    Exit;
  end;
  Msi := ExpandConstant('{tmp}\lerd-wsl.msi');
  WizardForm.FilenameLabel.Caption := '';
  Log('Running msiexec on ' + Msi);
  AddDetail('Installing the WSL package (msiexec)');
  if not Exec(ExpandConstant('{sys}\msiexec.exe'), '/i ' + Quote(Msi) + ' /qn /norestart', '', SW_HIDE, ewWaitUntilTerminated, Code)
    or ((Code <> 0) and (Code <> 3010)) then
  begin
    Failed := FmtMessage(CustomMessage('ErrExit'), [CustomMessage('StepWSL'), IntToStr(Code)]);
    Exit;
  end;
  { msiexec returns before Windows Installer finishes registering WSL, and the
    stub asked in that window offers to install WSL all over again. }
  for I := 1 to 60 do
  begin
    if WSLInstalled then
    begin
      Result := True;
      Exit;
    end;
    Sleep(2000);
  end;
  Failed := CustomMessage('ErrWSLNotReady');
end;

function EnsureDistro: Boolean;
begin
  Result := DistroInstalled or
    Run(FmtMessage(CustomMessage('StepDistro'), [Distro]), WSLExe, '--install -d ' + Distro + ' --no-launch --web-download');
end;

{ MarkProvisioned makes uid 1000 the distro's default user and tells WSL its
  first-run setup is done, so the distro never asks for a user of its own. }
procedure MarkProvisioned;
var
  Keys: TArrayOfString;
  Name: String;
  I: Integer;
begin
  if not RegGetSubkeyNames(HKCU, LxssKey, Keys) then
    Exit;
  for I := 0 to GetArrayLength(Keys) - 1 do
    if RegQueryStringValue(HKCU, LxssKey + '\' + Keys[I], 'DistributionName', Name) and (CompareText(Name, Distro) = 0) then
    begin
      RegWriteDWordValue(HKCU, LxssKey + '\' + Keys[I], 'DefaultUid', 1000);
      RegWriteDWordValue(HKCU, LxssKey + '\' + Keys[I], 'RunOOBE', 0);
    end;
end;

{ EnsureUser gives the distro a sudo user and systemd, and makes that user the
  default. The password reaches chpasswd through WSLENV, so it never shows up
  on a command line or on disk. Both wsl.conf settings need the distro
  restarted, which --terminate does. }
function EnsureUser: Boolean;
var
  Status, WSLEnv: String;
begin
  Status := FmtMessage(CustomMessage('StepUser'), [LinuxUser]);
  if not UserExists then
  begin
    if not Run(Status, WSLExe, AsRoot('useradd -m -s /bin/bash -G sudo ' + LinuxUser)) then
    begin
      Result := False;
      Exit;
    end;
    WSLEnv := GetEnv('WSLENV');
    SetEnvironmentVariable('LERD_SETUP_PW', UserPage.Values[1]);
    if WSLEnv = '' then
      SetEnvironmentVariable('WSLENV', 'LERD_SETUP_PW')
    else
      SetEnvironmentVariable('WSLENV', WSLEnv + ':LERD_SETUP_PW');
    Result := Run(Status, WSLExe, AsRoot('printf ''%s:%s\n'' ' + LinuxUser + ' "$LERD_SETUP_PW" | chpasswd'));
    SetEnvironmentVariable('LERD_SETUP_PW', '');
    SetEnvironmentVariable('WSLENV', WSLEnv);
    if not Result then
      Exit;
    UserExists := True;
  end;
  Result := Run(Status, WSLExe, AsRoot('f=/etc/wsl.conf; touch $f' + #10 +
      'grep -q ''^systemd=true'' $f || printf ''\n[boot]\nsystemd=true\n'' >> $f' + #10 +
      'grep -q ''^default='' $f || printf ''\n[user]\ndefault=' + LinuxUser + '\n'' >> $f'))
    and Run(Status, WSLExe, '--terminate ' + Distro);
  if Result then
    MarkProvisioned;
end;

{ InstallPackages installs the packages lerd's installer checks for, and turns
  on linger, because with no terminal its offer to do both reads as "no" and it
  stops without Podman. Keep the list in step with install.sh and the WSL guide. }
function InstallPackages: Boolean;
begin
  Result := Run(CustomMessage('StepPackages'), WSLExe, AsRoot(
    'export DEBIAN_FRONTEND=noninteractive' + #10 +
    'apt-get update -q && apt-get install -y -q podman uidmap fuse-overlayfs slirp4netns curl git unzip libnss3-tools && ' +
    'loginctl enable-linger ' + LinuxUser));
end;

function GrantSudo: Boolean;
var
  Lines: TArrayOfString;
begin
  Result := CaptureLines(WSLExe, AsRoot('printf ''%s ALL=(ALL) NOPASSWD:ALL\n'' ' + LinuxUser + ' > ' + SudoersDropIn +
    ' && chmod 0440 ' + SudoersDropIn), Lines) = 0;
  if not Result then
    Failed := FmtMessage(CustomMessage('ErrExit'), ['sudo', '1']);
end;

procedure RemoveSudoers;
var
  Lines: TArrayOfString;
begin
  CaptureLines(WSLExe, AsRoot('rm -f ' + SudoersDropIn), Lines);
end;

{ ApplyOptions turns the Options page into lerd commands. The installers took
  the defaults (.test with HTTPS, lerd-managed Node), so only a change from them
  runs anything. It comes before wsl:setup, which reads the DNS mode to decide
  whether Windows needs the .test rule. }
function ApplyOptions: Boolean;
begin
  Result := True;
  if LerdInstalled then
    Exit;
  if DNSLocalhost.Checked then
    Result := Run(CustomMessage('StepOptions'), WSLExe, AsUser('~/.local/bin/lerd dns:disable'));
  if Result and not ManageNode.Checked then
    Result := Run(CustomMessage('StepOptions'), WSLExe, AsUser('~/.local/bin/lerd node:unmanage'));
end;

{ TrustCA imports lerd's root CA into the Windows user's Root store, which makes
  Windows ask the user to confirm. wsl:setup does the same, but its certutil
  starts deep in a chain of hidden processes and its dialog opens behind Setup,
  where nobody sees it. Started from Setup it comes to the front; once the CA
  is in the store, wsl:setup's import has nothing left to ask. Declining is not
  a failure: the sites still work, with a browser warning. }
function TrustCA: Boolean;
var
  Lines: TArrayOfString;
  Crt: String;
  Code: Integer;
begin
  Result := True;
  if not LerdInstalled and DNSLocalhost.Checked then
    Exit;
  Crt := ExpandConstant('{tmp}\lerd-rootCA.crt');
  { No CA means .localhost mode, which has no certificates to trust. mkcert's
    CAROOT is read directly: Lerd no longer ships mkcert to ask for it. }
  if CaptureLines(WSLExe, AsUser('cp "${CAROOT:-${XDG_DATA_HOME:-$HOME/.local/share}/mkcert}/rootCA.pem" "$(wslpath ''' + Crt + ''')"'), Lines) <> 0 then
    Exit;
  if not PowerShell('$c = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 ''' + Crt + '''; ' +
    '$c.Thumbprint; if (Test-Path (''Cert:\CurrentUser\Root\'' + $c.Thumbprint)) { ''trusted'' }', Lines)
    or (GetArrayLength(Lines) = 0) then
    Exit;
  { Uninstall takes back exactly this certificate and no other mkcert CA. }
  RegWriteStringValue(HKCU, LerdKey, 'CAThumbprint', Lines[0]);
  if (GetArrayLength(Lines) > 1) and (Lines[1] = 'trusted') then
    Exit;
  SetStatus(CustomMessage('StepCA'));
  if not WizardSilent then
    MsgBox(CustomMessage('CAPrompt'), mbInformation, MB_OK);
  if not Exec(ExpandConstant('{sys}\certutil.exe'), '-addstore -user -f Root ' + Quote(Crt), '', SW_HIDE, ewWaitUntilTerminated, Code)
    or (Code <> 0) then
  begin
    Log(Format('certutil exited with %d', [Code]));
    AddDetail(CustomMessage('CADeclined'));
  end;
end;

{ InstallLerd runs lerd's own installer inside the distro, so Windows gets what
  every Linux machine gets. /local=<folder> (or LERD_SETUP_LOCAL) names a
  Windows folder holding install.sh, lerd and lerd.exe, to test a build before
  it is released. }
function InstallLerd: Boolean;
var
  Local, Script: String;
begin
  Local := ExpandConstant('{param:local|}');
  if Local = '' then
    Local := GetEnv('LERD_SETUP_LOCAL');
  if Local <> '' then
    Script := 'cd "$(wslpath ''' + Local + ''')" && bash install.sh --local ./lerd'
  else
    { Windows support arrives in 1.38, so until it is stable the beta line is
      installed, with install.sh from that release: lerd.sh serves the stable
      one, which before 1.38 leaves lerd.exe out. }
    Script := 'v=$(curl -fsSLo /dev/null -w ''%{url_effective}'' https://github.com/lerd-env/lerd/releases/latest); ' +
      'v=${v##*/}; flag=; printf ''%s\n'' 1.38.0 ${v#v} | sort -VC || { flag=--beta; ' +
      'v=$(curl -fsSL https://github.com/lerd-env/lerd/releases.atom | grep -oE ''releases/tag/v[^"<[:space:]]+'' | head -1); v=${v#releases/tag/}; }; ' +
      'curl -fsSL https://raw.githubusercontent.com/lerd-env/lerd/$v/install.sh | bash -s -- $flag';
  Result := Run(FmtMessage(CustomMessage('StepLerd'), [Distro]), WSLExe, AsUser(Script))
    and ApplyOptions
    and TrustCA
    and Run(CustomMessage('StepIntegration'), WSLExe, AsUser('LERD_WSL_RESTART_HANDLED=1 ~/.local/bin/lerd wsl:setup'))
    { The desktop app only receives lerd's notifications from the native sink;
      the browser sink, lerd's default, sends them to dashboard pages. }
    and Run(CustomMessage('StepNotify'), WSLExe, AsUser('~/.local/bin/lerd notify target native'));
end;

{ StartLerd restarts WSL so mirrored networking and the resolver handover take
  effect, boots the distro again, and waits for the dashboard to answer. }
function StartLerd: Boolean;
var
  Status: String;
begin
  Status := CustomMessage('StepStart');
  Result := Run(Status, WSLExe, '--shutdown') and Run(Status, WSLExe, '-d ' + Distro + ' --exec /bin/true');
  if not Result then
    Exit;
  Result := Run(Status, PowerShellExe, PSParams('for ($i = 0; $i -lt 90; $i++) { ' +
    'try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:7073/ | Out-Null; exit 0 } ' +
    'catch { if ($_.Exception.Response) { exit 0 }; Start-Sleep 2 } }; exit 1'));
  if not Result then
    Failed := CustomMessage('ErrDashboard');
end;

{ ---- desktop app --------------------------------------------------------- }

{ On Windows the Lerd desktop app holds lerd's tray icon, raises its
  notifications, which lerd-ui hands it while it runs, and keeps lerd's agent
  running. Setup downloads it from the latest lerd-desktop release, unpacks it
  under the install folder and registers it with Windows itself; the app has no
  installer of its own. }

function DesktopDir: String;
begin
  Result := ExpandConstant('{app}\desktop');
end;

function DesktopExe: String;
begin
  Result := DesktopDir + '\lerd-desktop.exe';
end;

{ DesktopVersionFile records the release the app came from, so a rerun skips a
  download it already has. }
function DesktopVersionFile: String;
begin
  Result := ExpandConstant('{app}\desktop.version');
end;

function DesktopArch: String;
begin
  if IsArm64 then
    Result := 'arm64'
  else
    Result := 'x64';
end;

function DesktopZipName: String;
begin
  Result := 'lerd-desktop-win32-' + DesktopArch + '.zip';
end;

{ StopDesktopApp ends a running copy of the app, which holds its files open. }
procedure StopDesktopApp;
var
  Lines: TArrayOfString;
begin
  PowerShell('Get-Process -Name lerd-desktop -ErrorAction SilentlyContinue | ' +
    'Where-Object { $_.Path -like ''' + DesktopDir + '\*'' } | Stop-Process -Force; Start-Sleep 1', Lines);
end;

{ RegisterDesktopApp gives the app what Windows needs to treat it as lerd's:
  the app id its notifications are posted under, with lerd's name and logo,
  the lerd:// scheme that notification clicks open, and a start at sign-in,
  hidden in the tray. }
procedure RegisterDesktopApp;
var
  Exe, Key: String;
begin
  Exe := '"' + DesktopExe + '"';
  Key := 'Software\Classes\AppUserModelId\' + ToastAppID;
  RegWriteStringValue(HKCU, Key, 'DisplayName', 'Lerd');
  RegWriteStringValue(HKCU, Key, 'IconUri', ExpandConstant('{app}\lerd.png'));
  RegWriteStringValue(HKCU, 'Software\Classes\lerd', '', 'URL:Lerd');
  RegWriteStringValue(HKCU, 'Software\Classes\lerd', 'URL Protocol', '');
  RegWriteStringValue(HKCU, 'Software\Classes\lerd\DefaultIcon', '', Exe + ',0');
  RegWriteStringValue(HKCU, 'Software\Classes\lerd\shell\open\command', '', Exe + ' "%1"');
  RegWriteStringValue(HKCU, RunKey, 'lerd-desktop', Exe + ' --hidden');
end;

{ InstallDesktopApp downloads the app and unpacks it. /local=<folder> takes the
  app from a lerd-desktop-win32-<arch>.zip there when it holds one, to test an
  unreleased build; such a zip is unpacked on every run. }
function InstallDesktopApp: Boolean;
var
  Lines: TArrayOfString;
  Local, Zip, Tag: String;
  Installed: AnsiString;
begin
  Result := False;
  SetStatus(CustomMessage('StepApp'));
  Tag := '';
  Local := ExpandConstant('{param:local|}');
  if Local = '' then
    Local := GetEnv('LERD_SETUP_LOCAL');
  if (Local <> '') and FileExists(AddBackslash(Local) + DesktopZipName) then
  begin
    Zip := AddBackslash(Local) + DesktopZipName;
    AddDetail('Using ' + Zip);
  end
  else
  begin
    if not PowerShell('[Net.ServicePointManager]::SecurityProtocol = ''Tls12''; ' +
      '$r = Invoke-RestMethod https://api.github.com/repos/lerd-env/lerd-desktop/releases/latest; ' +
      '$a = $r.assets | Where-Object { $_.name -eq ''' + DesktopZipName + ''' } | Select-Object -First 1; ' +
      'if ($a) { $r.tag_name; $a.browser_download_url }', Lines)
      or (GetArrayLength(Lines) < 2) then
    begin
      Failed := FmtMessage(CustomMessage('ErrNoApp'), [DesktopArch]);
      Exit;
    end;
    Tag := Lines[0];
    if FileExists(DesktopExe) and LoadStringFromFile(DesktopVersionFile, Installed) and (Trim(String(Installed)) = Tag) then
    begin
      AddDetail('The desktop app is already at ' + Tag);
      RegisterDesktopApp;
      Result := True;
      Exit;
    end;
    AddDetail('Downloading ' + Lines[1]);
    DownloadName := 'the Lerd desktop app';
    try
      DownloadTemporaryFile(Lines[1], 'lerd-desktop.zip', '', @DownloadProgress);
    except
      Failed := GetExceptionMessage;
      Exit;
    end;
    WizardForm.FilenameLabel.Caption := '';
    Zip := ExpandConstant('{tmp}\lerd-desktop.zip');
  end;

  StopDesktopApp;
  DelTree(DesktopDir, True, True, True);
  DeleteFile(DesktopVersionFile);
  ForceDirectories(DesktopDir);
  AddDetail('Unpacking the desktop app');
  { Windows' own tar unpacks zips. Its complaints go to the log and the details
    box, since a half-unpacked app opens to a black window. }
  if not Run(CustomMessage('StepApp'), ExpandConstant('{sys}\tar.exe'), '-xf ' + Quote(Zip) + ' -C ' + Quote(DesktopDir)) then
    Exit;
  if not FileExists(DesktopExe) then
  begin
    Failed := FmtMessage(CustomMessage('ErrExit'), [CustomMessage('StepApp'), '0']);
    Exit;
  end;
  if Tag <> '' then
    SaveStringToFile(DesktopVersionFile, Tag, False);
  RegisterDesktopApp;
  Result := True;
end;

{ StartDesktopApp starts the app in the tray as the signed-in user, not with
  Setup's admin rights. }
procedure StartDesktopApp;
var
  Code: Integer;
begin
  if not ExecAsOriginalUser(DesktopExe, '--hidden', '', SW_SHOWNORMAL, ewNoWait, Code) then
    Log('Could not start the desktop app: ' + SysErrorMessage(Code));
end;

procedure SetProgress(Step: Integer);
begin
  WizardForm.ProgressGauge.Position := Step;
end;

procedure InstallLerdStack;
begin
  WizardForm.ProgressGauge.Min := 0;
  WizardForm.ProgressGauge.Max := 7;
  SetProgress(0);
  if not EnsureWSL then Exit;
  SetProgress(1);
  if not EnsureDistro then Exit;
  SetProgress(2);
  if not EnsureUser then Exit;
  SetProgress(3);
  if not InstallPackages then Exit;
  SetProgress(4);
  { Before lerd's wsl:setup, which leaves starting lerd's agent to the app
    when it finds it registered, rather than to a Run entry of its own. }
  if not InstallDesktopApp then Exit;
  SetProgress(5);
  if not GrantSudo then Exit;
  try
    if not InstallLerd then Exit;
  finally
    RemoveSudoers;
  end;
  SetProgress(6);
  if not StartLerd then Exit;
  StartDesktopApp;
  SetProgress(7);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    InstallLerdStack;
    if Failed <> '' then
    begin
      Log('Setup failed: ' + Failed);
      AddDetail('');
      AddDetail('ERROR: ' + Failed);
    end;
  end;
end;

function Succeeded: Boolean;
begin
  Result := Failed = '';
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID <> wpFinished then
    Exit;
  if Failed <> '' then
  begin
    WizardForm.FinishedHeadingLabel.Caption := CustomMessage('FailedHeading');
    WizardForm.FinishedLabel.Caption := FmtMessage(CustomMessage('FailedText'), [Failed, ExpandConstant('{log}')]);
  end
  else
    WizardForm.FinishedLabel.Caption := FmtMessage(CustomMessage('DoneText'), [Distro, LinuxUser]);
  { Setup laid the page out for its own, shorter text, so grow the label to fit
    ours and move the checkboxes below it instead of over its last lines. }
  WizardForm.FinishedLabel.AdjustHeight;
  WizardForm.RunList.Top := WizardForm.FinishedLabel.Top + WizardForm.FinishedLabel.Height + ScaleY(12);
  WizardForm.RunList.Height := WizardForm.FinishedPage.ClientHeight - WizardForm.RunList.Top;
end;

{ ---- uninstall ----------------------------------------------------------- }

function InitializeUninstall: Boolean;
begin
  Result := True;
  SetEnvironmentVariable('WSL_UTF8', '1');
  if UninstallSilent or not DistroInstalled then
    Exit;
  case TaskDialogMsgBox(FmtMessage(CustomMessage('UninstallQuestion'), [Distro]),
    FmtMessage(CustomMessage('UninstallQuestionText'), [Distro]), mbConfirmation, MB_YESNOCANCEL, [
    CustomMessage('UninstallKeepDistro'), CustomMessage('UninstallDeleteDistro')], 0) of
    IDYES: DeleteDistro := False;
    IDNO:
      begin
        DeleteDistro := MsgBox(FmtMessage(CustomMessage('UninstallConfirmDelete'), [Distro]),
          mbCriticalError, MB_YESNO or MB_DEFBUTTON2) = IDYES;
        Result := DeleteDistro;
      end;
  else
    Result := False;
  end;
end;

{ RemoveWindowsSide undoes what `lerd wsl:setup` put on Windows. lerd uninstall
  does the same from inside the distro; this covers a distro that is gone. It
  also stops the desktop app, so its folder can go, and takes back what
  RegisterDesktopApp wrote. }
{ UntrustCA removes the root CA TrustCA added. Windows asks before a root
  certificate leaves the store, as it asked when it came in, so a silent
  uninstall, with nobody to answer, leaves it trusted and says so in the log. }
procedure UntrustCA;
var
  Thumb: String;
  Code: Integer;
begin
  if not RegQueryStringValue(HKCU, LerdKey, 'CAThumbprint', Thumb) or (Thumb = '') then
    Exit;
  if UninstallSilent then
  begin
    Log('Left Lerd''s CA ' + Thumb + ' trusted: removing it needs Windows'' confirmation');
    Exit;
  end;
  UninstallProgressForm.StatusLabel.Caption := CustomMessage('UninstallCA');
  Exec(ExpandConstant('{sys}\certutil.exe'), '-delstore -user Root ' + Thumb, '', SW_HIDE, ewWaitUntilTerminated, Code);
  Log(Format('certutil -delstore exited with %d', [Code]));
end;

procedure RemoveWindowsSide;
var
  Lines: TArrayOfString;
begin
  UninstallProgressForm.StatusLabel.Caption := CustomMessage('UninstallWindows');
  StopDesktopApp;
  RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Classes\lerd');
  RegDeleteValue(HKCU, RunKey, 'lerd-desktop');
  PowerShell(
    '$d = Join-Path $env:LOCALAPPDATA ''lerd''; ' +
    { The agent exits on its own once its config is gone. }
    'Remove-Item (Join-Path $d ''bin\lerd-wsl.conf'') -ErrorAction SilentlyContinue; ' +
    'Remove-ItemProperty -Path ''HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'' -Name ''lerd'' -ErrorAction SilentlyContinue; ' +
    'Remove-Item -Path ''HKCU:\Software\Classes\AppUserModelId\sh.lerd.Lerd'' -Recurse -ErrorAction SilentlyContinue; ' +
    '$b = Join-Path $d ''bin''; $p = [Environment]::GetEnvironmentVariable(''Path'', ''User''); ' +
    'if ($p) { [Environment]::SetEnvironmentVariable(''Path'', (($p -split '';'') | Where-Object { $_ -and $_ -ne $b }) -join '';'', ''User'') }; ' +
    'Get-DnsClientNrptRule | Where-Object { $_.Comment -eq ''lerd'' } | Remove-DnsClientNrptRule -Force; Clear-DnsClientCache; ' +
    'Remove-NetFirewallHyperVRule -Name ''lerd-lan'' -ErrorAction SilentlyContinue; ' +
    'Start-Sleep 3; ' +
    'Get-Process -Name lerd -ErrorAction SilentlyContinue | Where-Object { $_.Path -like ($b + ''\*'') } | Stop-Process -Force; ' +
    'for ($i = 0; $i -lt 10 -and (Test-Path $d); $i++) { Remove-Item $d -Recurse -Force -ErrorAction SilentlyContinue; Start-Sleep 1 }',
    Lines);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Code: Integer;
begin
  if CurUninstallStep <> usUninstall then
    Exit;
  if DistroInstalled then
  begin
    if DeleteDistro then
    begin
      UninstallProgressForm.StatusLabel.Caption := FmtMessage(CustomMessage('UninstallDistro'), [Distro]);
      Exec(WSLExe, '--unregister ' + Distro, '', SW_HIDE, ewWaitUntilTerminated, Code);
    end
    else
    begin
      LinuxUser := ExistingUser;
      if LinuxUser <> '' then
      begin
        UninstallProgressForm.StatusLabel.Caption := FmtMessage(CustomMessage('UninstallLerd'), [Distro]);
        GrantSudo;
        Run('lerd uninstall', WSLExe, AsUser('[ -x ~/.local/bin/lerd ] && ~/.local/bin/lerd uninstall --keep-data || true'));
        RemoveSudoers;
      end;
    end;
  end;
  RemoveWindowsSide;
  UntrustCA;
  RegDeleteKeyIncludingSubkeys(HKCU, LerdKey);
  RegDeleteValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\RunOnce', 'lerd-setup');
end;
