interface Props {
  params: Promise<{
    project_id: string;
  }>;
}

const Page = async ({ params }: Props) => {
  const { project_id } = await params;

  return <div>Project id: {project_id}</div>;
};

export default Page;
