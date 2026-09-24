import { useState, useEffect, useRef } from 'react';
import { classService, fingerprintService } from '../../services/api';
import { useScannerStatus } from '../../hooks/useScannerStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { SelectSimple } from '../ui/Select';
import { Fingerprint, Radio, Square, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export function LiveClassScanner() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [markedStudents, setMarkedStudents] = useState([]);
  const [currentStudent, setCurrentStudent] = useState(null);
  const { status: arduinoStatus, refresh: refreshArduinoStatus } = useScannerStatus();
  const [showStudentPopup, setShowStudentPopup] = useState(false);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    classService.getAll().then((response) => {
      if (mounted) setClasses(response.classes || []);
    }).catch(() => toast.error('Failed to load classes'));
    return () => {
      mounted = false;
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  async function checkArduinoStatus() {
    try {
      const status = await refreshArduinoStatus();
      if (!status.ready) {
        toast.error('⚠️ Arduino fingerprint scanner not connected!', { duration: 5000 });
      }
    } catch {
      toast.error('Cannot connect to fingerprint scanner');
    }
  };

  const startLiveClass = () => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }
    if (!arduinoStatus.ready) {
      toast.error('Fingerprint scanner is not ready');
      return;
    }

    setIsLive(true);
    setMarkedStudents([]);
    toast.success('🔴 LIVE CLASS STARTED! Scanner activated.');

    // Poll every 2 seconds
    scanIntervalRef.current = setInterval(async () => {
      try {
        const result = await fingerprintService.verifyAndMark(selectedClass);
        
        if (result.success && !result.alreadyMarked) {
          // New student marked
          const student = {
            ...result.student,
            time: new Date().toLocaleTimeString(),
            status: result.attendance.status
          };
          
          setMarkedStudents(prev => [student, ...prev]);
          setCurrentStudent(student);
          setShowStudentPopup(true);
          
          // Play success sound
          new Audio('data:audio/wav;base64,UklGRhIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==').play().catch(() => {});
          
          toast.success(`✅ ${student.name} marked present!`, { duration: 3000 });
          
          setTimeout(() => setShowStudentPopup(false), 3000);
        } else if (result.alreadyMarked) {
          toast(`⚠️ ${result.student.name} already marked today`, { icon: '⚠️', duration: 2000 });
        }
      } catch {
        // Silent - no fingerprint detected
      }
    }, 2000);
  };

  const stopLiveClass = () => {
    setIsLive(false);
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    toast.success('⏹️ Live class stopped');
  };

  const selectedClassData = classes.find(c => c._id === selectedClass);
  const totalStudents = selectedClassData?.students?.length || 0;
  const markedCount = markedStudents.length;
  const percentage = totalStudents > 0 ? (markedCount / totalStudents) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Arduino Status */}
      <Card className={`border-2 ${arduinoStatus.ready ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-4 w-4 rounded-full ${arduinoStatus.ready ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <div>
                <p className="font-bold text-lg">
                  {arduinoStatus.ready ? '✅ Scanner Ready' : '❌ Scanner Not Connected'}
                </p>
                <p className="text-sm text-gray-600">
                  {arduinoStatus.enrolled_count} fingerprints enrolled in system
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={checkArduinoStatus}>
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Class Controls */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Radio className={`h-6 w-6 ${isLive ? 'text-red-600 animate-pulse' : 'text-blue-600'}`} />
            Live Class Scanner
          </CardTitle>
          <CardDescription className="text-base">
            Select a class and click "Go Live" to start marking attendance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Class Selection */}
          <div className="flex gap-4">
            <div className="flex-1">
              <SelectSimple
                value={selectedClass}
                onChange={setSelectedClass}
                placeholder="Select a class to start"
                options={classes.map(c => ({
                  value: c._id,
                  label: `${c.name} (${c.code}) - ${c.students?.length || 0} students`
                }))}
                disabled={isLive}
                className="h-12 text-base"
              />
            </div>
            <Button 
              onClick={isLive ? stopLiveClass : startLiveClass}
              disabled={!selectedClass || !arduinoStatus.ready}
              variant={isLive ? 'destructive' : 'default'}
              className="min-w-[180px] h-12 text-base font-bold"
            >
              {isLive ? (
                <>
                  <Square className="h-5 w-5 mr-2" />
                  STOP LIVE CLASS
                </>
              ) : (
                <>
                  <Radio className="h-5 w-5 mr-2" />
                  GO LIVE
                </>
              )}
            </Button>
          </div>

          {/* Live Scanner Display */}
          {isLive && (
            <div className="space-y-6 pt-6 border-t-2 border-dashed">
              {/* Scanning Animation */}
              <div className="relative h-48 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl overflow-hidden border-4 border-blue-400">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Fingerprint className="h-24 w-24 text-blue-600 animate-pulse" />
                </div>
                <div className="absolute inset-0 fingerprint-scanner"></div>
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-center py-3">
                  <p className="text-lg font-bold animate-pulse">
                    🔴 LIVE - Place finger on scanner...
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="bg-white p-6 rounded-lg border-2">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-bold">
                    Students Marked: {markedCount} / {totalStudents}
                  </span>
                  <span className="text-2xl font-bold text-blue-600">{percentage.toFixed(0)}%</span>
                </div>
                <Progress value={percentage} className="h-3" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Popup */}
      {showStudentPopup && currentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md mx-4 border-4 border-green-500 shadow-2xl animate-in zoom-in duration-300">
            <CardHeader className="text-center bg-green-50 pb-4">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              <CardTitle className="text-3xl text-green-600 font-bold">
                ✓ ATTENDANCE MARKED!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-3 pb-6">
              <p className="text-3xl font-bold">{currentStudent.name}</p>
              <p className="text-xl text-gray-600">{currentStudent.rollNumber}</p>
              <p className="text-lg text-gray-500">{currentStudent.time}</p>
              <Badge variant="success" className="text-base px-4 py-2">
                Welcome to {selectedClassData?.name}! 🎉
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recently Marked Students */}
      {markedStudents.length > 0 && (
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students Marked ({markedCount})
            </CardTitle>
            <CardDescription>Students who marked attendance in this live session</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {markedStudents.map((student, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border-2 bg-green-50 border-green-200 animate-in slide-in-from-top duration-300"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-bold text-lg">{student.name}</p>
                      <p className="text-sm text-gray-600">{student.rollNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="success" className="mb-1">PRESENT</Badge>
                    <p className="text-xs text-gray-500">{student.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
