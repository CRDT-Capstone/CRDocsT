import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";

export type RemoteCursor = {
    userIdentity: string;
    pos: number;
    color: string;
};

export const createRemoteCursorEffect = StateEffect.define<RemoteCursor[]>();

class CursorWidget extends WidgetType {
    color: string;
    userIdentity: string;

    constructor(color: string, userIdentity: string) {
        super();
        this.color = color;
        this.userIdentity = userIdentity;
    }

    toDOM(): HTMLElement {
        const wrap = document.createElement("span");
        wrap.className = "relative inline-block border-l-2 h-[1.2em] group align-middle mx-[-1px]";
        wrap.style.borderColor = this.color;

        const label = document.createElement("div");
        label.className = `
            absolute -top-4 left-0 
            px-1.5 py-0.5 
            text-[10px] text-white font-bold whitespace-nowrap
            rounded-sm opacity-0 group-hover:opacity-100 
            transition-opacity pointer-events-none z-50
        `;
        label.style.backgroundColor = this.color;
        label.innerText = this.userIdentity;

        wrap.appendChild(label);
        return wrap;
    }

    eq(other: CursorWidget): boolean {
        return this.color === other.color && this.userIdentity === other.userIdentity;
    }

    get estimatedHeight() {
        return 0;
    }
}

export type RemoteCursorEffect = typeof createRemoteCursorEffect;

export const remoteCursors = StateField.define<DecorationSet>({
    create: function (state) {
        return Decoration.none;
    },
    update: function (cursors, tr) {
        cursors = cursors.map(tr.changes);
        for (let e of tr.effects) {
            if (e.is(createRemoteCursorEffect)) {
                const docL = tr.state.doc.length;
                const sorted = [...e.value].sort((a, b) => a.pos - b.pos);
                const ranges = sorted
                    .filter((c) => c.pos <= docL)
                    .map((c) =>
                        Decoration.widget({
                            widget: new CursorWidget(c.color, c.userIdentity),
                            side: 1,
                        }).range(c.pos),
                    );
                return Decoration.set(ranges, true);
            }
        }
        return cursors;
    },
    provide: (f) => EditorView.decorations.from(f),
});

export const remoteCursorSupport = () => {
    return [remoteCursors];
};
