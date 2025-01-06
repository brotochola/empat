import { Fish } from "./fish";

export class fishSounds {
  static sounds: HTMLAudioElement[] = [];
  myAudios: HTMLAudioElement[] = [];

  static loadSounds() {
    for (let i = 1; i < 13; i++) {
      let aud = new Audio("assets/sounds/bubble" + i + ".mp3");
      // aud.volume = 0.02;
      fishSounds.sounds.push(aud);
    }
    
  }
  constructor(private fish: Fish) {
    // window.fishSounds = fishSounds;
    if (!fishSounds.sounds.length) {
      fishSounds.loadSounds();
    }

    this.myAudios.push(fishSounds.getRandomBubbleSound());
    this.myAudios.push(fishSounds.getRandomBubbleSound());
    this.myAudios.push(fishSounds.getRandomBubbleSound());
  }

  playSoundWithRandomPitch() {
    const s = this.getRandomBubbleSoundFromMySounds();

    s.playbackRate = Math.random()  + 0.25;
    s.volume = Math.random() * 0.02;
    // s.pan
    s.play();
  }

  static getRandomBubbleSound(): HTMLAudioElement {
    return fishSounds.sounds[
      Math.floor(fishSounds.sounds.length * Math.random())
    ];
  }

  getRandomBubbleSoundFromMySounds(): HTMLAudioElement {
    return this.myAudios[Math.floor(this.myAudios.length * Math.random())];
  }
}
