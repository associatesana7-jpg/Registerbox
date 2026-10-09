// Render the same QR matrix as Expo CLI, with a four-module quiet zone.
const { createRequire } = require('node:module');
const { writeFileSync } = require('node:fs');
const expoRequire = createRequire(require.resolve('expo/package.json'));
const cliRequire = createRequire(expoRequire.resolve('@expo/cli'));
const { toQR } = cliRequire('toqr');
const { PNG } = require('pngjs');
const url = process.argv[2];
if (!url || !url.startsWith('exp://')) throw Error('Provide the running Expo Go URL.');
const matrix = toQR(url), size = Math.sqrt(matrix.length), scale = 16, border = 4;
const png = new PNG({width:(size+border*2)*scale,height:(size+border*2)*scale});
for(let y=0;y<png.height;y++) for(let x=0;x<png.width;x++) {
  const row=Math.floor(y/scale)-border,col=Math.floor(x/scale)-border;
  const dark=row>=0&&col>=0&&row<size&&col<size&&matrix[row*size+col]===1;
  const offset=(y*png.width+x)*4;
  png.data[offset]=png.data[offset+1]=png.data[offset+2]=dark?0:255;
  png.data[offset+3]=255;
}
const output=process.argv[3]||'/tmp/registerbox-expo-qr.png';
writeFileSync(output,PNG.sync.write(png));
console.log(output);
