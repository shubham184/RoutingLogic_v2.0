/* eslint linebreak-style: ["error", "windows"] */
class AnswerGenerator {
  static newReplyObject() {
    return { replies: [] };
  }

  static newMessagesObject() {
    return { messages: [] };
  }

  static generateTextAnswer(text) {
    const answer = {
      type: "text",
      content: text,
    };

    return answer;
  }

  static generateQuickReplies(choices) {
    const replies = [];

    for (let i = 0; i < choices.length; i += 1) {
      replies.push(this.generateButton(choices[i]));
    }

    const answer = {
      type: "quickReplies",
      content: {
        title: "TITLE",
        buttons: replies,
      },
    };

    return answer;
  }

  static generateButtonAnswer(buttonTexts) {
    const buttons = [];
    for (let i = 0; i < buttonTexts.length; i += 1) {
      buttons.push(this.generateButton(buttonTexts[i]));
    }

    const reply = {
      type: "buttons",
      content: {
        title: "Incidents",
        buttons,

      },
    };

    return reply;
  }

  static generateButton(buttonText) {
    const button = {
      title: buttonText,
      value: buttonText,
    };
    return button;
  }

  static generateElement(text, text2, text3) {
    const buttons = [];

    buttons.push(this.generateButton(text2));
    const element = {
      title: text,
      imageUrl: "",
      subtitle: text3,
      buttons,
    };

    return element;
  }

  static generateListAnswer(titles, buttonTexts, descriptions) {
    const elements = [];
    for (let i = 0; i < buttonTexts.length; i += 1) {
      elements.push(this.generateElement(titles[i], buttonTexts[i], descriptions[i]));
    }

    const answer = {
      type: "list",
      content: {
        elements,
      },
    };

    return answer;
  }

  static generateMemory(keys, values) {
    for (let i=0; i < keys.length; i += 1) {
        const 
    }
    const conversation = {
        "memory": {

        }
    }

    return conversation;

  }
}

module.exports = AnswerGenerator;
