import { Game, Question } from "../scenes/Game";

const defaultQuestions: Question[] = [
  {
    question: "what color is the highlighted fish?",
    answer: "red",
    fishToHighlight: "red",
  },
  {
    question: "what color is the highlighted fish?",
    answer: "orange",
    fishToHighlight: "orange",
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
  currentQuestion: number = 0;
  textElement: HTMLParagraphElement;
  finished = false;
  recognition: any;

  constructor(private scene: Game, private questions: Question[]) {
    if (!questions) {
      this.questions = defaultQuestions;
    }

    this.createTextInScene();
  }

  start() {
    //THIS IS BECAUSE I NEED A CLICK BEFORE STARTING AUDIO STUFF
    this.showText("Click on the screen to start...");

    this.scene.game.canvas.onclick = this.scene.game.canvas.ontouchstart =
      () => {
        this.setupSpeechRecognition();
        this.showQuestion();
        this.scene.game.canvas.onclick = this.scene.game.canvas.ontouchstart =
          null;
      };
  }

  setupSpeechRecognition() {
    this.recognition = new window.webkitSpeechRecognition();
    this.recognition.lang = "en-US"; // Set the language
    this.recognition.interimResults = false; // Allow partial results
    this.recognition.continuous = false; // Keep recognizing until stopped
    this.recognition.onresult = (result: any) =>
      this.handleResultFromRecognition(result);
    this.recognition.onerror = (e: any) => console.warn(e);

    console.log("### speech recognition SETUP");
  }
  private handleResultFromRecognition(result: any): void {
    console.log(result);
    for (let i = 0; i < result.results.length; i++) {
      let r: any = result.results[i];
      console.log("###", i);
      if (r.isFinal) {
        const text = r[0].transcript;
        if (text) {
        
          this.answerQuestion(text);
        }
      }
    }
  }

  createTextInScene(): void {
    this.textElement = document.createElement("p");
    this.textElement.id = "question";
    this.textElement.classList.add("text");
    document.body.appendChild(this.textElement);
    this.textElement.style.display = "none";
  }

  showQuestion() {
    console.log("# SHOW QUESTION");
    const question = this.questions[this.currentQuestion];

    this.showText(question.question);
    setTimeout(() => this.recognition.start(), 100);
    //IF THE QUESTION HAS A TYPE OF FISH TO HIGHLIGHT
    if (question.fishToHighlight) {
      this.highlightOneFish(question);
    }
  }

  highlightOneFish(question: Question) {
    //WE GET ITS NUMBER
    const fishType = QuestionManager.fishTypes[question.fishToHighlight];
    //FILTER THE FISH THERE ARE IN THE SCENE
    const potentialFishToHighlight = this.scene.arrOfFish.filter(
      (k) =>
        k.fishType == fishType &&
        !k.bgFish &&
        k.x < this.scene.worldWidth * 0.85 &&
        k.x > this.scene.worldWidth * 0.05
    );
    //HIGHLIGHT IT
    if (potentialFishToHighlight.length) {
      potentialFishToHighlight[0].highlight();
      this.scene.scrollTo(
        potentialFishToHighlight[0].x - window.innerWidth * 0.5
      );
    } else {
      debugger;
    }
  }

  answerQuestion(answer: string) {
    const question = this.questions[this.currentQuestion];
    this.scene.toast.show("You said: "+answer);

    //TRIM AND LOWER CASE TO COMPARE STRINGS WITHOUT ISSUES
    if (answer.toLowerCase().trim() == question.answer.toLowerCase().trim()) {
      console.log("#CORRECT");

      this.correctAnswer();
    } else {
      console.log("#INCORRECT");
      this.wrongAnswer();
    }
  }

  wrongAnswer() {
    this.showText("WRONG ANSWER :(");

    setTimeout(() => {
      this.scene.unhighlightAllFish();
      this.textElement.style.display = "none";
      setTimeout(() => this.showQuestion(), 1000);
    }, 1500);
  }
  correctAnswer() {
    this.showText("CORRECT!");
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
    this.textElement.innerText = "YOU WON!";
    this.textElement.style.display = "block";
  }
}
