import { useQuery } from "@tanstack/react-query";
import { getCurrentHomeId } from "../api";

export const useCurrentHome = () =>
  useQuery({
    queryKey: ["current-home"],
    queryFn: getCurrentHomeId,
  });
