'use babel';

import TonetypeView from './tonetype-view';
import { CompositeDisposable } from 'atom';
import { Note, Sequence } from 'tinymusic';

const pitches = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G'
];

function getRange(number) {
  return Math.min(Math.max(Math.floor(number / 7), 4), 5);
}

function getNote(number) {
  return pitches[(number % 7) - 1];
}

function createSequence(ac, tempo) {
  const sequence = new Sequence(ac, tempo);
  sequence.createCustomWave([-0.6,0.25,0.9,0.1,-1,-1,0]);
  sequence.staccato = 0.25;
  sequence.mid.frequency.value = 800;
  sequence.mid.gain.value = 3;
  sequence.gain.gain.value = 0.5;
  return sequence;
};

export default {

  tonetypeView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.tonetypeView = new TonetypeView(state.tonetypeViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.tonetypeView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();
    this.observers = new CompositeDisposable();

    // create Web Audio API context
    this.ac = new AudioContext();
    this.tempo = 120;
    this.sequence = createSequence(this.ac, this.tempo);
    this.sequenceLength = 0;

    const bass = [
      'D3  q',
      '-   h',
      'D3  q',

      'A2  q',
      '-   h',
      'A2  q',

      'Bb2 q',
      '-   h',
      'Bb2 q',

      'F2  h',
      'A2  h'
    ];
    this.bassSequence = new Sequence(this.ac, this.tempo, bass);
    this.bassSequence.staccato = 0.05;
    this.bassSequence.smoothing = 0.4;
    this.bassSequence.bass.gain.value = 6;
    this.bassSequence.bass.frequency.value = 80;
    this.bassSequence.treble.gain.value = -2;
    this.bassSequence.gain.gain.value = 0.3;

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'tonetype:toggle': () => this.toggle(),
      'tonetype:deactivate': () => this.deactivate()
    }));

    this.boundKeyHandler = this.handleKey.bind(this);
  },

  handleKey(e) {
    const number = e.which;
    if (number) {
      // translate key to a note
      const range = getRange(number);
      const note = getNote(number);
      const noteString = `${note}${range} e`;
      if (this.sequenceLength >= 64) {
        this.sequence.stop();
        this.sequence = createSequence(this.ac, this.tempo);
        this.sequenceLength = 0;
        this.sequence.push(noteString);
        this.sequence.play(this.ac.currentTime);
      } else {
        this.sequence.push(noteString);
        this.sequenceLength++;
      }

      if (Math.random() < 0.2) {
        this.sequence.push(`${getNote(number + 1)}${range} s`, `${note}${range} s`);
      }
    }
  },

  deactivate() {
    this.sequence.stop();
    this.bassSequence.stop();

    atom.workspace.observeTextEditors((editor) => {
      var editorView = atom.views.getView(editor);
      editorView.removeEventListener('keyup', this.boundKeyHandler);
    });
  },

  serialize() {
    return {
      tonetypeViewState: this.tonetypeView.serialize()
    };
  },

  toggle() {
    const when = this.ac.currentTime;
    this.sequence.play(when);
    this.bassSequence.play(when);

    atom.workspace.observeTextEditors((editor) => {
      var editorView = atom.views.getView(editor);
      editorView.addEventListener('keyup', this.boundKeyHandler);
    });
  }

};
