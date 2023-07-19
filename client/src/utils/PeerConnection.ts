export class PeerConnection {
    pc: RTCPeerConnection | null = null;

    dc: RTCDataChannel | null = null;
    timer: NodeJS.Timeout | null = null;
    owner: number;
    target: number;
    static server: Object;
    static emit: any = () => {};
    constructor(owner: number, target: number) {
        this.owner = owner;
        this.target = target;
    }

    get LD() {
        return this.pc?.localDescription;
    }

    get RD() {
        return this.pc?.remoteDescription;
    }

    get state() {
        return this.pc?.connectionState;
    }

    async gatherCandidate(isMaster: boolean = true) {
        console.log("candidate start");
        return new Promise(async (res, rej) => {
            this.pc!.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
                const candidate = e.candidate;
                console.log("candidate1", candidate);
                if (candidate === null) {
                    res(this.pc?.localDescription);
                }
            };
            const offer = isMaster
                ? await this.pc!.createOffer()
                : await this.pc!.createAnswer();
            await this.pc!.setLocalDescription(offer);
        });
    }

    async initMaster() {
        try {
            this.clear();
            clearTimeout(this.timer!);
            this.timer = setTimeout(() => {
                if (this.state !== "connected") {
                    this.initMaster();
                }
            }, 60000);
            this.pc = new RTCPeerConnection(PeerConnection.server);
            this.pc.onconnectionstatechange = () => {
                if (this.state === "disconnected" || this.state === "failed") {
                    this.initMaster();
                }
            };
            this.dc = this.pc.createDataChannel("dc");
            this.pc!.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
                const candidate = e.candidate;
                if (candidate) {
                    const message = {
                        type: "candidate",
                        targetId: this.target,
                        ownerId: this.owner,
                        SD: candidate,
                    };
                    console.log("send candidate", message);
                    PeerConnection.emit("sd", message);
                }
            };
            const offer = await this.pc!.createOffer();
            await this.pc!.setLocalDescription(offer);

            //updateLD
            const message = {
                ownerId: this.owner,
                targetId: this.target,
                SD: offer,
                type: "offer",
            };
            console.log("send offer", message);
            PeerConnection.emit("sd", message);
        } catch (err) {
            console.log("failed to init master", err);
            this.initMaster();
        }
    }

    clear() {
        clearTimeout(this.timer!);
        this.pc?.close();
        this.pc = null;
    }

    addCandidate(candidate: RTCIceCandidate) {
        console.log("receive candidate", candidate)
        if (!this.pc) throw Error("no peerconnection to add ice candidate!");
        this.pc.addIceCandidate(candidate);
    }

    async initSlave(offer: RTCSessionDescriptionInit) {
        this.pc = new RTCPeerConnection(PeerConnection.server);
        console.log("receive offer", offer)
        await this.pc?.setRemoteDescription(offer);
        this.pc!.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
            const candidate = e.candidate;

            if (candidate) {
                const message = {
                    type: "candidate",
                    targetId: this.target,
                    ownerId: this.owner,
                    SD: candidate,
                };
                console.log("send candidate", message);
                PeerConnection.emit("sd", message);
            }
        };
        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);
        const message = {
            ownerId: this.owner,
            targetId: this.target,
            SD: answer,
            type: "answer",
        };
        console.log("send answer", message);

        PeerConnection.emit("sd", message);

        //updateLD
    }

    async connect(answer: RTCSessionDescriptionInit) {
        console.log("receive answer", answer)
        if (!this.pc) throw Error("no peerconnection to add ice candidate!");
        await this.pc.setRemoteDescription(answer);
    }
}
