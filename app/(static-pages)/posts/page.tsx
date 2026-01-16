import { getAllPosts } from '@/common/utils/post';
import PostsClient from './PostsClient';

export default function PostsPage() {
  const allPosts = getAllPosts();

  return <PostsClient posts={allPosts} />;
}
