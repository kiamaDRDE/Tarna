import GroupContent from "@/src/components/personnal/groupContent";
import { fetchDetailGroup } from "../action";
import type { DetailedGroupResponse } from "@/src/types/group";

type Props = { params: { id: string } };

const GroupDetailPage = async ({ params }: Props) => {
  const { id } = await params;
  const detail: DetailedGroupResponse | null = await fetchDetailGroup(id);
  return <GroupContent group={detail} />;
};

export default GroupDetailPage;
