import { Game, Question } from "../scenes/Game";

const defaultQuestions: Question[] = [
  {
    question: "1 - Say it out loud: What color is the highlighted fish?",
    answer: "green",
    fishToHighlight: "green",
  },
  {
    question: "2 - Say it out loud: What color is the highlighted fish?",
    answer: "orange",
    fishToHighlight: "orange",
  },
  {
    question: "3 - Say it out loud: What color is the highlighted fish?",
    answer: "pink",
    fishToHighlight: "pink",
  },
  {
    question: "4 - Say it out loud: What color is the highlighted fish?",
    answer: "red",
    fishToHighlight: "red",
  },
];

export class QuestionManager {
  static fishTypes: any = {
    orange: 80,
    red: 78,
    blue: 76,
    pink: 74,
    brown: 100,
    green: 72,
  };
  static states: any = {
    beforeLoading: 0,
    initialized: 1,
    waiting: 2,
    listening: 3,
    won: 4,
  };
  state: string = QuestionManager.states.beforeLoading;
  currentQuestion: number = 0;
  textElement: HTMLParagraphElement;
  finished = false;
  recognition: any;

  correctFX: HTMLAudioElement = new Audio("assets/sounds/correct.mp3");
  wrongFX: HTMLAudioElement = new Audio("assets/sounds/wrong.mp3");

  constructor(private scene: Game, private questions: Question[]) {
    if (!questions) {
      this.questions = defaultQuestions;
    }

    this.correctFX.volume = 0.1;
    this.wrongFX.volume = 0.3;

    this.createTextInScene();
  }

  start() {
    //THIS IS BECAUSE I NEED A CLICK BEFORE STARTING AUDIO STUFF
    this.showText("Click on the screen to start...");
    this.state = QuestionManager.states.initialized;
    this.scene.game.canvas.onclick = this.scene.game.canvas.ontouchstart =
      () => {
        this.setupSpeechRecognition();
        if (this.recognition) this.showQuestion();
        else{
          this.showText("Browser not supported");
        }
        this.scene.game.canvas.onclick = this.scene.game.canvas.ontouchstart =
          null;
      };
  }

  setupSpeechRecognition() {
    //I'm using the speech recognition API, it does not work on Safari or Firefox
    try {
      this.recognition = new window.webkitSpeechRecognition();
      this.recognition.lang = "en-US"; // Set the language
      this.recognition.interimResults = false; // Allow partial results
      this.recognition.continuous = true; // Keep recognizing until stopped
      this.recognition.onaudiostart = () => {
        console.log("#audio started");
      };
      this.recognition.onresult = (result: any) =>
        this.handleResultFromRecognition(result);
      this.recognition.onerror = (e: any) => {
        console.warn(e);
        this.scene.toast.show("It took you too long...");

        this.showQuestion();
      };
    } catch (e) {
      console.warn("NO SPEECH RECOGNITION API");
      this.scene.toast.show(
        "Speech Recognition is not available on this browser, try again with Chrome",
        9999
      );
    }

    console.log("### speech recognition SETUP");
  }

  private handleResultFromRecognition(result: any): void {
    console.log(result);
    if (result.results.length) {
      //I JUST GRAB THE FIRST ONE
      const text = result.results[0][0].transcript;

      this.recognition.stop();
      this.answerQuestion(text);
    }
    // // for (let i = 0; i < result.results.length; i++) {
    //   let r: any = result.results[i];

    //   //   if (r.isFinal) {
    //   const text = r[0].transcript;
    //   if (text) {
    //     this.answerQuestion(text);
    //   }
    //   //   }
    // // }
  }

  createTextInScene(): void {
    this.textElement = document.createElement("p");
    this.textElement.id = "question";
    this.textElement.classList.add("text");
    document.body.appendChild(this.textElement);
    this.textElement.style.display = "none";
  }

  startRecognizing() {
    this.recognition.stop();

    setTimeout(() => {
      this.recognition.start();
      this.scene.toast.show("Listening...");
      this.state = QuestionManager.states.listening;
    }, 250);
  }

  showQuestion() {
    console.log("# SHOW QUESTION");

    const question = this.questions[this.currentQuestion];

    this.showText(question.question);
    //IF THE QUESTION HAS A TYPE OF FISH TO HIGHLIGHT
    if (question.fishToHighlight) {
      this.highlightOneFish(question);
    }
    this.startRecognizing();
  }

  highlightOneFish(question: Question) {
    console.log("# highlighting...", question);
    //WE GET ITS NUMBER
    const fishType = QuestionManager.fishTypes[question.fishToHighlight];
    //FILTER THE FISH THERE ARE IN THE SCENE
    let potentialFishToHighlight = this.scene.arrOfFish.filter(
      (k) =>
        k.fishType == fishType &&
        !k.bgFish &&
        k.x < this.scene.worldWidth * 0.85 &&
        k.x > this.scene.worldWidth * 0.05
    );

    if (!potentialFishToHighlight.length) {
      potentialFishToHighlight = this.scene.arrOfFish.filter(
        (k) => k.fishType == fishType && !k.bgFish
      );
    }

    if (!potentialFishToHighlight.length) {
      this.whatToDoIfTheresNoFishToHighlight(question);
      return;
    }
    potentialFishToHighlight[0].highlight();
    this.scene.scrollTo(
      potentialFishToHighlight[0].x - window.innerWidth * 0.5
    );
  }

  whatToDoIfTheresNoFishToHighlight(question: Question) {
    this.scene.toast.show(
      "This is akward, there's no fish of the " +
        question.fishToHighlight +
        " type. We're skipping this question"
    );
    this.currentQuestion++;
    this.showQuestion();
  }

  answerQuestion(answer: string) {
    const question = this.questions[this.currentQuestion];
    this.scene.toast.show("You said: " + answer);

    //TRIM AND LOWER CASE TO COMPARE STRINGS WITHOUT ISSUES
    if (
      answer.toLowerCase().indexOf(question.answer.toLowerCase().trim()) > -1
    ) {
      console.log("#CORRECT");

      this.correctAnswer();
    } else {
      console.log("#INCORRECT");
      this.wrongAnswer();
    }
  }

  wrongAnswer() {
    this.showText("WRONG ANSWER :(");
    this.wrongFX.play();
    this.state = QuestionManager.states.waiting;
    setTimeout(() => {
      this.scene.unhighlightAllFish();
      this.textElement.style.display = "none";
      setTimeout(() => this.showQuestion(), 1000);
    }, 1500);
  }
  emitALotOfBubbles() {
    let x = 500 + this.scene.scrollX;
    let y = -80;
    this.scene.emitBubbles(x, y, 50);
    for (let i = 0; i < 10; i++) {
      setTimeout(() => this.scene.emitBubbles(x + i * 30, y, 70), i * 50);
    }
  }
  correctAnswer() {
    this.showText("CORRECT!");
    this.correctFX.play();
    this.emitALotOfBubbles();

    this.state = QuestionManager.states.waiting;
    setTimeout(() => {
      this.scene.unhighlightAllFish();
      this.textElement.style.display = "none";
      setTimeout(() => this.gotoNextQuestion(), 1500);
    }, 1500);
  }
  gotoNextQuestion() {
    this.currentQuestion++;

    if (this.currentQuestion >= this.questions.length) {
      this.finished = true;
      this.youWon();
    } else {
      this.showQuestion();
    }
  }

  showText(text: string) {
    this.textElement.style.display = "none";
    this.textElement.classList.remove("withSlignShotAnim");
    setTimeout(() => {
      this.textElement.innerText = text;
      this.textElement.style.display = "block";
      this.textElement.classList.add("withSlignShotAnim");
    }, 300);
  }

  youWon() {
    this.state = QuestionManager.states.won;
    this.textElement.innerText = "YOU WON!";
    this.textElement.style.display = "block";
  }

  getStateAsString(): string {
    for (const [key, value] of Object.entries(QuestionManager.states)) {
      if (value === this.state) {
        return key;
      }
    }
    return "Unknown state";
  }
}
