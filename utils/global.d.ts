type Application = {
  id: string;
  company: string;
  link: string;
  stage: Stage;
  application: ApplicationStage;
  interviews: Interview[];
};

type Stage = "ap" | "r1" | "r2" | "r3" | "of" | "xx";

type ApplicationStage = {
  date: number;
  questions: Question[];
  notes: string;
};

type Interview = {
  round: number;
  date?: number;
  questions: Question[];
  notes?: string;
};

type Question = {
  id: string;
  question: string;
  answer: string;
};

type Message =
  | {
      event: "startApplication";
      data: {
        url: string;
        title: string;
      };
    }
  | {
      event: "addQuestion";
      data: string;
    }
  | {
      event: "addAnswer";
      data: string;
    }
  | {
      event: "setApplicationInProgress";
      data: Application;
    }
  | {
      event: "completeApplication";
      data: {
        newApplication: Application;
        tabId: number;
      };
    }
  | {
      event: "shouldEnableToggle";
      data: number;
    }
  | {
      event: "toggleWindow";
      data: boolean;
    }
  | {
      event: "openWindow";
      data: {
        page: number;
      };
    }
  | {
      event: "resetWindow";
      data: null;
    }
  | {
      event: "getTabId";
      data: null;
    }
  | {
      event: "updateTab";
      data: number;
    };
