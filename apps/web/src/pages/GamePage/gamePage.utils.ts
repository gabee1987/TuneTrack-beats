import { defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import type { PublicRoomState } from "@tunetrack/shared";
import type { ThemeId } from "../../features/preferences/uiPreferences";

export function animateTimelineLayoutChanges(
  args: Parameters<typeof defaultAnimateLayoutChanges>[0],
) {
  return defaultAnimateLayoutChanges(args);
}

export function formatPhaseLabel(status: PublicRoomState["status"]): string {
  switch (status) {
    case "turn":
      return "Play";
    case "challenge":
      return "Challenge";
    case "reveal":
      return "Reveal";
    case "finished":
      return "Finished";
    case "lobby":
      return "Lobby";
    default:
      return "Game";
  }
}

export function getCardGradient(
  theme: ThemeId,
  seed: string,
  variant: "default" | "preview" | "overlay" = "default",
): string {
  const darkGradients = [
    "linear-gradient(142deg, rgba(88, 105, 245, 0.92) 0%, rgba(62, 199, 192, 0.78) 100%)",
    "linear-gradient(227deg, rgba(130, 92, 235, 0.92) 0%, rgba(234, 99, 171, 0.76) 100%)",
    "linear-gradient(116deg, rgba(58, 160, 196, 0.9) 0%, rgba(99, 110, 240, 0.78) 100%)",
    "linear-gradient(201deg, rgba(240, 142, 88, 0.88) 0%, rgba(176, 103, 227, 0.72) 100%)",
    "linear-gradient(132deg, rgba(76, 177, 128, 0.88) 0%, rgba(70, 138, 216, 0.74) 100%)",
    "linear-gradient(238deg, rgba(226, 101, 152, 0.84) 0%, rgba(235, 166, 88, 0.72) 100%)",
    "linear-gradient(154deg, rgba(92, 126, 247, 0.9) 0%, rgba(126, 96, 214, 0.76) 100%)",
    "linear-gradient(213deg, rgba(67, 171, 161, 0.86) 0%, rgba(167, 186, 90, 0.72) 100%)",
  ];
  const lightGradients = [
    "linear-gradient(142deg, rgba(163, 187, 255, 0.96) 0%, rgba(147, 232, 216, 0.93) 100%)",
    "linear-gradient(227deg, rgba(201, 173, 255, 0.96) 0%, rgba(255, 176, 214, 0.92) 100%)",
    "linear-gradient(116deg, rgba(154, 216, 240, 0.96) 0%, rgba(170, 185, 255, 0.92) 100%)",
    "linear-gradient(201deg, rgba(255, 201, 157, 0.95) 0%, rgba(208, 176, 255, 0.91) 100%)",
    "linear-gradient(132deg, rgba(164, 226, 182, 0.95) 0%, rgba(160, 209, 244, 0.91) 100%)",
    "linear-gradient(238deg, rgba(248, 177, 202, 0.95) 0%, rgba(247, 213, 149, 0.91) 100%)",
    "linear-gradient(154deg, rgba(168, 190, 255, 0.96) 0%, rgba(195, 177, 244, 0.92) 100%)",
    "linear-gradient(213deg, rgba(160, 225, 216, 0.95) 0%, rgba(212, 223, 137, 0.91) 100%)",
  ];
  const gradients = theme === "light" ? lightGradients : darkGradients;
  const seedValue = Array.from(seed).reduce(
    (accumulator, character) => accumulator + character.charCodeAt(0),
    0,
  );
  const gradient = gradients[seedValue % gradients.length] ?? gradients[0] ?? "";

  if (variant === "overlay") {
    return `${gradient}, linear-gradient(160deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%)`;
  }

  if (variant === "preview") {
    return `${gradient}, radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.12), transparent 28%)`;
  }

  return gradient;
}
