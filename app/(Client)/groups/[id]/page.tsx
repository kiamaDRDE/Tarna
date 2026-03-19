import GroupContent from "@/src/components/personnal/groupContent";
import GroupDetailClient from "@/src/components/personnal/groupDetailClient";
import { fetchDetailGroup } from "../action";
import type { DetailedGroupResponse } from "@/src/types/group";

type Props = { params: { id: string } };

const GroupDetailPage = async ({ params }: Props) => {
  const { id } = await params;
  const detail: DetailedGroupResponse | null = await fetchDetailGroup(id);
  return (
    <GroupDetailClient group={detail}>
      <GroupContent group={detail} />
    </GroupDetailClient>
  );
};

export default GroupDetailPage;
