import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const userProfile = process.env.USERPROFILE || 'C:\\Users\\jiaba';
const desktop = path.join(userProfile, 'Desktop');
const projectRoot = 'd:\\code\\Eisenhower-Matrix';
const targetExe = path.join(projectRoot, 'EisenhowerMatrix.exe');
const shortcutPath = path.join(desktop, '四象限时间管理.lnk');

// Edge Icon path
let iconPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe,0';
if (!fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')) {
  iconPath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe,0';
}

const tempVbs = path.join(projectRoot, 'scripts', '_temp_create_shortcut.vbs');
const vbsContent = '\uFEFF' + `
Set ws = CreateObject("WScript.Shell")
Set sc = ws.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
sc.TargetPath = "${targetExe.replace(/\\/g, '\\\\')}"
sc.Arguments = ""
sc.WorkingDirectory = "${projectRoot.replace(/\\/g, '\\\\')}"
sc.IconLocation = "${iconPath.replace(/\\/g, '\\\\')}"
sc.Description = "四象限时间管理"
sc.Save
`;

fs.writeFileSync(tempVbs, vbsContent, { encoding: 'utf16le' });

try {
  execSync(`cscript //nologo "${tempVbs}"`, { stdio: 'inherit' });
  console.log('Shortcut created successfully targeting exe at:', shortcutPath);
} finally {
  if (fs.existsSync(tempVbs)) {
    fs.unlinkSync(tempVbs);
  }
}
