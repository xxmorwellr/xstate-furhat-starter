import { setup, createActor, fromPromise, assign } from "xstate";

const FURHATURI = "127.0.0.1:54321";

async function fhGetUser() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/users`, {
    method: "POST",
    headers: myHeaders,
    body: "",
  });
}

async function fhUserTracking() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/attend?user=CLOSEST`, {
    method: "POST",
    headers: myHeaders,
    body: "",
  });
}

async function fhSay(text: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encText = encodeURIComponent(text);
  return fetch(`http://${FURHATURI}/furhat/say?text=${encText}&blocking=true`, {
    method: "POST",
    headers: myHeaders,
    body: "",
  });
}

async function greetingGesture() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/gesture?blocking=false`, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({
      name: "Greeting",
      frames: [
        {
          time: [0, 0.4], //ADD THE TIME FRAME OF YOUR LIKING
          persist: true,
          params: {
            //ADD PARAMETERS HERE IN ORDER TO CREATE A GESTURE
            "SURPRISE":1,
            "NECK_ROLL":0.7,
            "SMILE_OPEN":0.4,
            "SMILE_CLOSED":0.7
          },
        },
        {
          time: [0.7], //ADD TIME FRAME IN WHICH YOUR GESTURE RESETS
          persist: false, //optional
          params: {
            reset: true,
          },
        },
        //ADD MORE TIME FRAMES IF YOUR GESTURE REQUIRES THEM
      ],
      class: "furhatos.gestures.Gesture",
    }),
  });
}

async function nodGesture() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/gesture?blocking=false`, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({
      name: "Nod",
      frames: [
        {
          time: [0.17, 1.0, 6.0], // time range
          persist: true,
          params: {
            "LOOK_DOWN": 0.7,
            "NECK_PAN": -12.0,
            "NECK_TILT": -25.0
          }
        },
        {
          time: [0.7], //ADD TIME FRAME IN WHICH YOUR GESTURE RESETS
          persist: false, //optional
          params: {
              reset: true,
          },
        },
        //ADD MORE TIME FRAMES IF YOUR GESTURE REQUIRES THEM
      ],
      class: "furhatos.gestures.Gesture",
    }),
  });
}

async function fhGesture(text: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(
    `http://${FURHATURI}/furhat/gesture?name=${text}&blocking=true`,
    {
      method: "POST",
      headers: myHeaders,
      body: "",
    },
  );
}

async function fhListen() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/listen`, {
    method: "GET",
    headers: myHeaders,
  })
    .then((response) => response.body)
    .then((body) => body.getReader().read())
    .then((reader) => reader.value)
    .then((value) => JSON.parse(new TextDecoder().decode(value)).message);
}

const dmMachine = setup({
  actors: {
    fhHello: fromPromise<any, null>(async () => {
      return Promise.all([
        fhSay("Hi"), 
        greetingGesture()
      ])
    }),
    fhL: fromPromise<any, null>(async () => {
     return fhListen();
    }),
    fhGetUser: fromPromise<any, null>(async () => {
      return fhGetUser();
    }),
    fhUserTracker: fromPromise<any, null>(async () => {
      return fhUserTracking();
    }),
    fhSpeak: fromPromise<any, {message: string}>(async ({input}) => {
      return Promise.all([
        fhSay(input.message),
      ])
    }),
  },
}).createMachine({
  id: "root",
  initial: "Start",
  states: {
    Start: { after: { 1000: "GetUser" } },
    GetUser: {
      invoke: {
        src: "fhGetUser",
        input: null,
        onDone: {
          target: "UserTracking",
          actions: ({ event }) => console.log(event.output),
        },
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event),
        },
      },
    },
    UserTracking: {
      invoke: {
        src: "fhUserTracker",
        input: null,
        onDone: {
          target: "Greeting",
          actions: ({ event }) => console.log(event.output),
        },
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event),
        },
      },
    },
   Greeting: {
      invoke: {
        src: "fhHello",
        input: null,
        onDone: {
          target: "Listen1",
          actions: ({ event }) => console.log(event.output),
        },
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event),
        },
      },
    },
    Listen1: {
      invoke: {
        src: "fhL",
        input: null,
        onDone: {
          target: "Confused",
          actions: [
            ({ event }) => console.log(event.output), 
            assign({ lastResult: ({ event }) => event.output,}),
        ]},
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event),
        },
      },
    },
    Confused: {
      invoke: {
        src : "fhSpeak",
        input: { message: "Ok! I would try" },
        onDone: {
          target:"Speak",
          actions: ({ event }) => console.log(event.output)
        },
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event)
      }
    },
  },
  Fail: {},
  },
});

const actor = createActor(dmMachine).start();
console.log(actor.getSnapshot().value);

actor.subscribe((snapshot) => {
  console.log(snapshot.value);
});
