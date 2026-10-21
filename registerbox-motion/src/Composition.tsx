import {Audio} from '@remotion/media';
import {Composition, Folder, Sequence, staticFile} from 'remotion';
import {Period} from './scenes/Period';
import {Hook} from './scenes/Hook';
import {Review} from './scenes/Review';
import {Authorize} from './scenes/Authorize';
import {Verify} from './scenes/Verify';
import {Close} from './scenes/Close';

export const NilReturnFilm = () => <>
  <Sequence name="Nil, made simple" durationInFrames={120}><Hook/></Sequence>
  <Sequence name="01 — Select your period" from={120} durationInFrames={150}><Period/></Sequence>
  <Sequence name="02 — Review nil conditions" from={270} durationInFrames={210}><Review/></Sequence>
  <Sequence name="03 — Authorize and request OTP" from={480} durationInFrames={180}><Authorize/></Sequence>
  <Sequence name="04 — Verify and file" from={660} durationInFrames={180}><Verify/></Sequence>
  <Sequence name="RegisterBox" from={840} durationInFrames={120}><Close/></Sequence>
  <Audio name="Original music — 100 BPM" src={staticFile('audio/original-music.wav')} volume={0.31}/>
  <Audio name="Voice — Opening" src={staticFile('audio/01-hook.wav')} from={15}/>
  <Audio name="Voice — Choose period" src={staticFile('audio/02-period.wav')} from={130}/>
  <Audio name="Voice — Nil declaration" src={staticFile('audio/03-review.wav')} from={286}/>
  <Audio name="Voice — Signatory and OTP" src={staticFile('audio/04-authorize.wav')} from={492}/>
  <Audio name="Voice — Verify and file" src={staticFile('audio/05-verify.wav')} from={672}/>
  <Audio name="Voice — RegisterBox" src={staticFile('audio/06-close.wav')} from={848}/>
</>;

export const MyComposition = () => <>
  <Composition id="RegisterBox-Nil-Return" component={NilReturnFilm} durationInFrames={960} fps={30} width={1080} height={1920}/>
  <Folder name="Scenes">
    <Composition id="Opening" component={Hook} durationInFrames={120} fps={30} width={1080} height={1920}/>
    <Composition id="Period-Proof" component={Period} durationInFrames={150} fps={30} width={1080} height={1920}/>
    <Composition id="Review" component={Review} durationInFrames={210} fps={30} width={1080} height={1920}/>
    <Composition id="Authorize" component={Authorize} durationInFrames={180} fps={30} width={1080} height={1920}/>
    <Composition id="Verify" component={Verify} durationInFrames={180} fps={30} width={1080} height={1920}/>
    <Composition id="Closing" component={Close} durationInFrames={120} fps={30} width={1080} height={1920}/>
  </Folder>
</>;
