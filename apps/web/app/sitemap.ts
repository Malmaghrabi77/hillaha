import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.hillaha.com", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://www.hillaha.com/privacy", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: "https://www.hillaha.com/terms", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];
}
