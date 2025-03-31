
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Home, AlertCircle } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md p-8"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-red-50">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
        </div>
        
        <h1 className="text-5xl font-display font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <Button
          onClick={() => navigate("/")}
          className="bg-sg-blue-600 hover:bg-sg-blue-700 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
        >
          <Home className="mr-2 h-4 w-4" />
          Return Home
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
