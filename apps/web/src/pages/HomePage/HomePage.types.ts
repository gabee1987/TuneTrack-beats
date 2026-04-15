import type { FormEvent } from "react";

export interface HomePageController {
  displayName: string;
  roomId: string;
  setDisplayName: (value: string) => void;
  setRoomId: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export interface HomePageAssemblyProps {
  controller: HomePageController;
}

export interface JoinRoomFormProps {
  displayName: string;
  roomId: string;
  onDisplayNameChange: (value: string) => void;
  onRoomIdChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
