import React, { FC, useEffect, useMemo, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";
import { PeerConnection } from "../../utils/PeerConnection";
import { IAuthForm, IUserContext, UserInfo } from "../../types/types";
import PeerConnectionsManager from "../../utils/PeerConnectionsManager";

import { prettyPrint } from "prettier-print";

interface Room {
    id: string;
    roomName: string;
    owner?: string;
    users?: User[];
    history?: any[];
}

export interface User {
    id: number;
    username: string;
    ICE?: string;
    lastLogin?: Date;
    lastActive?: Date;
    online?: boolean;
    createdRooms?: Room[];
    room: Room;
}
interface PCMap {
    [id: string]: PeerConnection;
}
export interface IHomeProps {
    user: UserInfo;
    login: (user: IAuthForm) => void;
    signup: (user: IAuthForm) => void;
    signout: (user: IAuthForm) => void;
}

export interface SDMessage {
    ownerId: string;
    SD: string;
    type: string;
}

export interface IStatusMessage {
    onlineUsers: User[];
    rooms: Room[]
}
PeerConnection.server = {
    iceServers: [
        {
            urls: [
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun4.l.google.com:19302",
            ],
        },
    ],
    iceCandidatePoolSize: 0,
};

const Home: FC<IHomeProps> = ({ user: curUser, login, signup, signout }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const [joinRoomName, setJoinRoomName] = useState("");
    const [createRoomName, setCreateRoomName] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const PCMRef = useRef(new PeerConnectionsManager(curUser, socket));
    const currentRoom = useMemo(
        () => onlineUsers.find((user) => user.id === curUser.userId)?.room,
        [onlineUsers, curUser]
    );
    const roomUsers = useMemo(
        () => onlineUsers.filter((user) => user.room?.id === currentRoom?.id),
        [currentRoom, onlineUsers]
    );
    useEffect(() => {
        if (!curUser.token) return;
        const socket = io("http://18.207.208.28", {
            auth: {
                token: curUser.token,
            },
        });
        PCMRef.current.updateCurUser(curUser);
        setSocket(socket);
    }, [curUser]);

    useEffect(() => {
        PCMRef.current.updateSocket(socket);
    }, [socket]);

    useEffect(() => {
        PCMRef.current.updateRoomUsers(roomUsers);
    }, [roomUsers]);

    useEffect(() => {
        const onConnect = () => {
            console.log("connect");
        };
        const onStatus = (statusMessage:IStatusMessage) => {
            const {rooms, onlineUsers} = statusMessage;
            setOnlineUsers(onlineUsers)
            setRooms(rooms)
        };

        const onDisconnect = () => {
            console.log("disconnect");
        };
        const onConnectError = (err: any) => {
            alert("connection error, reason:" + err);
        };

        const onError = (err: any) => {
            alert(err);
        };
        const onLobby = () => {};
        const onSD = (message: SDMessage) => {
            console.log("received!")
            PCMRef.current.updateSD(message)
        };
        socket?.on("sd", onSD);
        socket?.on("connect", onConnect);
        socket?.on("connect_error", onConnectError);
        socket?.on("disconnect", onDisconnect);
        socket?.on("status", onStatus);
        socket?.on("lobby", onLobby);
        socket?.on("error", onError);
        return () => {
            socket?.off("sd", onSD);
            socket?.off("connect_error", onConnectError);
            socket?.off("connect", onConnect);
            socket?.off("disconnect", onDisconnect);
            socket?.off("status", onStatus);
            socket?.off("lobby", onLobby);
            socket?.off("error", onError);
        };
    }, [socket]);

    useEffect(() => {
        const interval = setInterval(() => {
            prettyPrint(
                null,
                Object.entries(PCMRef.current.PCMap).map(([target, pc]) => {
                    return {
                        target,
                        state: pc.state,
                        ld: pc.LD,
                        rd: pc.RD,
                    };
                }),
                onlineUsers
            );
        }, 1000);
        return () => clearInterval(interval);
    }, [onlineUsers]);

    const handleJoinRoom = () => {
        if (!socket) {
            alert("ws is not connected");
            return;
        }
        socket.emit("joinroom", joinRoomName, (res: any) => {
            // console.log("res", res);
        });
    };

    const handleCreateRoom = () => {
        if (!socket) {
            alert("ws is not connected");
            return;
        }
        socket.emit("createroom", createRoomName);
    };

    const handleQuitRoom = () => {
        if (!socket) {
            alert("ws is not connected");
            return;
        }

        socket.emit("quitroom");
    };
    return (
        <div>
            {isConnecting ? (
                "loading"
            ) : (
                <div>
                    <h1>
                        currentRoom: {currentRoom?.roomName || "not joined"}
                    </h1>
                    <div>
                        {rooms.map((room) => (
                            <div key={room.roomName}>{room.roomName}</div>
                        ))}
                    </div>
                    <div>
                        {onlineUsers.map((user) => (
                            <div key={user.username}>
                                {user.username}
                                {` in room: `}
                                {user.room?.roomName}
                            </div>
                        ))}
                    </div>
                    <div>
                        <input
                            onChange={(e) => setJoinRoomName(e.target.value)}
                            value={joinRoomName}
                        />
                        <button onClick={handleJoinRoom}>join room</button>
                    </div>
                    <div>
                        <input
                            onChange={(e) => setCreateRoomName(e.target.value)}
                            value={createRoomName}
                        />
                        <button onClick={handleCreateRoom}>create room</button>
                    </div>
                    <div>
                        <button onClick={handleQuitRoom}>quit room</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
