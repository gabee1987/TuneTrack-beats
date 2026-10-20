import { useNavigate } from "react-router-dom";
import { resetSocketClient } from "../../../services/socket/socketClient";

/** A guest leaving the lobby for Home on purpose. */
export function useLeaveLobby(): () => void {
  const navigate = useNavigate();

  return () => {
    // The protocol has no leave-room event; closing the socket tells the server this was deliberate.
    resetSocketClient();
    navigate("/", { replace: true });
  };
}
