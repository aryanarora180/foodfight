"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function FoodFightDog({
  className = "w-28 sm:w-32",
  alt = "the food fight dog, pointing at you",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      className={`pointer-events-none ${className}`}
    >
      <Image
        src="/food-fight-dog.png"
        alt={alt}
        width={541}
        height={800}
        className="h-auto w-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
      />
    </motion.div>
  );
}
