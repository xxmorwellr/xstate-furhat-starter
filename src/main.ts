import { setup, createActor, fromPromise, assign } from "xstate";

// list my Settings
// Mask: adult
// Character: Jane
// Voice: EmmaNeural (en-US) - Microsoft Azure
// *sound effect from Pixabay

const FURHATURI = "127.0.0.1:54321";

// Get Users and keep tracking
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

// Custom Gestures
async function smileGesture() { // example from help doc
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/gesture?blocking=false`, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({
        name:"BigSmile",
        frames:[
         {
            "time":[0.32,0.64],
            "persist":false, 
            "params":{
              "BROW_UP_LEFT":1,
              "BROW_UP_RIGHT":1,
              "SMILE_OPEN":0.4,
              "SMILE_CLOSED":0.7
              }
          },
          {
            "time":[0.96],
            "persist":false,
            "params":{
              "reset":true
              }
          }],
        class:"furhatos.gestures.Gesture"
        })
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
          persist: false,
          params: {
            //ADD PARAMETERS HERE IN ORDER TO CREATE A GESTURE
            "SURPRISE":1,
            "NECK_ROLL":7,
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

async function refusedGesture() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/gesture?blocking=false`, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({
      name: "refused",
      frames: [
        {
          time: [0.8], // time range
          persist: false,
          params: {
            "BROW_UP_LEFT": 0.4,
            "NECK_PAN": 7 // -50-50
          }
        },
        {
          time: [1.2], //ADD TIME FRAME IN WHICH YOUR GESTURE RESETS
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

// Custom audio
async function fhAudioSound(url: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encURL = encodeURIComponent(url);
  
  return fetch(`http://${FURHATURI}/furhat/say?url=${encURL}&blocking=true`, {
    method: "POST",
    headers: myHeaders,
    body: "",
  });
}

// Call built-in params
// async function fhGesture(text: string) {
//   const myHeaders = new Headers();
//   myHeaders.append("accept", "application/json");
//   return fetch(
//     `http://${FURHATURI}/furhat/gesture?name=${text}&blocking=true`,
//     {
//       method: "POST",
//       headers: myHeaders,
//       body: "",
//     },
//   );
// }

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
        fhSay("Hi, what can I do for you?"), 
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
    fhRefuse: fromPromise<any, null>(async () => {
      return Promise.all([
        fhAudioSound("https://furhat-audio.s3.eu-north-1.amazonaws.com/thinkingHm.wav"),
        fhSay("...I think I couldn't"), 
        refusedGesture()
      ])
    }),
    fhSmile: fromPromise<any, null>(async () => {
      return Promise.all([
        fhSay("but I can chit-chat with you"), 
        smileGesture()
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
          target: "Listen",
          actions: ({ event }) => console.log(event.output),
        },
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event),
        },
      },
    },
    Listen: {
      invoke: {
        src: "fhL",
        input: null,
        onDone: {
          target: "Refuse",
          actions: [
            ({ event }) => console.log(event.output), // e.g., "Can you imitate bird-singing?"
            assign({ lastResult: ({ event }) => event.output,}),
        ]},
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event),
        },
      },
    },
    Refuse: {
      invoke: {
        src : "fhRefuse",
        input: null,
        onDone: {
          target:"Smile",
          actions: ({ event }) => console.log(event.output)
        },
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event)
        }
      },
    },
    Smile: {
      invoke: {
        src : "fhSmile",
        input: null,
        onDone: {
          target:"Recognised",
          actions: ({ event }) => console.log(event.output)
        },
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event)
        }
      },
    },
    Recognised: {},
    Fail: {},
  },
});

const actor = createActor(dmMachine).start();
console.log(actor.getSnapshot().value);

actor.subscribe((snapshot) => {
  console.log(snapshot.value);
});
